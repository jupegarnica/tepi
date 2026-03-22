import { filePathsToFiles } from "./files.ts";
import { Block, File, GlobalData, Meta } from "./types.ts";
import { consumeBodies, fetchBlock } from "./fetchBlock.ts";
import { assertResponse } from "./assertResponse.ts";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  parseMetaFromText,
  parseRequestFromText,
  parseResponseFromText,
} from "./parser.ts";
import * as assertions from "@std/assert";
import type { BlockState, StoreApi } from "./ui/store/index.ts";
import { serializeMeta, serializeRequest, serializeResponse } from "./ui/utils/serialize.ts";
import { deriveFailureContext } from "./failureContext.ts";

type RunCounts = {
  successfulBlocks: number;
  failedBlocks: number;
  ignoredBlocks: number;
};

type RunnerState = {
  blocksDone: Set<Block>;
  allBlockNeeded: Map<string, Block>;
  counts: RunCounts;
  fileBlockTotals: Map<string, number>;
  fileBlocksDone: Map<string, number>;
  filesMarkedRunning: Set<string>;
};

function getThreads(meta: Meta): number {
  const value = Number(meta.threads ?? 1);
  if (!Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value;
}

function updateBlockFinished(
  store: StoreApi | undefined,
  blockId: string,
  patch: Partial<BlockState>,
) {
  const completedAt = Date.now();
  const startTime = store?.getState().blocks[blockId]?.startTime ?? completedAt;

  store?.getState().updateBlock(blockId, {
    ...patch,
    elapsedTime: completedAt - startTime,
    completedAt,
  });
}

function incrementCounters(
  block: Block,
  counts: RunCounts,
  store?: StoreApi,
) {
  if (block.meta._isIgnoredBlock) {
    counts.ignoredBlocks++;
    store?.getState().incrementIgnore();
  }
  if (block.meta._isFailedBlock) {
    counts.failedBlocks++;
    store?.getState().incrementFail();
  }
  if (block.meta._isSuccessfulBlock) {
    counts.successfulBlocks++;
    store?.getState().incrementSuccess();
  }
}

function markFileDoneIfNeeded(
  block: Block,
  state: RunnerState,
  store?: StoreApi,
) {
  const relativePath = block.meta._relativeFilePath || "";
  const doneCount = (state.fileBlocksDone.get(relativePath) || 0) + 1;
  state.fileBlocksDone.set(relativePath, doneCount);
  if (doneCount === state.fileBlockTotals.get(relativePath)) {
    store?.getState().setFileStatus(relativePath, "done");
  }
}

function getBlockDependencies(
  files: File[],
  allBlockNeeded: Map<string, Block>,
): Map<Block, Set<Block>> {
  const dependencies = new Map<Block, Set<Block>>();
  const fileFirstBlocks: Block[] = [];

  for (const file of files) {
    const firstBlock = file.blocks[0];
    if (firstBlock) {
      fileFirstBlocks.push(firstBlock);
    }
  }

  for (const file of files) {
    const firstBlock = file.blocks[0];
    const priorFirstBlocks = new Set<Block>();

    for (const candidate of fileFirstBlocks) {
      if (candidate === firstBlock) {
        break;
      }
      priorFirstBlocks.add(candidate);
    }

    for (const block of file.blocks) {
      const blockDependencies = new Set<Block>(priorFirstBlocks);
      if (firstBlock && block !== firstBlock) {
        blockDependencies.add(firstBlock);
      }
      if (block.meta.needs) {
        const neededBlock = allBlockNeeded.get(block.meta.needs);
        if (neededBlock) {
          blockDependencies.add(neededBlock);
        }
      }
      dependencies.set(block, blockDependencies);
    }
  }

  return dependencies;
}

async function runScheduledBlock(
  block: Block,
  globalData: GlobalData,
  state: RunnerState,
  store?: StoreApi,
) {
  const relativePath = block.meta._relativeFilePath || "";

  if (!state.filesMarkedRunning.has(relativePath)) {
    state.filesMarkedRunning.add(relativePath);
    store?.getState().setFileStatus(relativePath, "running");
  }

  await runBlock(
    block,
    globalData,
    relativePath,
    state.blocksDone,
    state.allBlockNeeded,
    store,
  );
}

async function runBlocksWithScheduler(
  files: File[],
  globalData: GlobalData,
  state: RunnerState,
  threads: number,
  failFast: boolean,
  onlyMode: Set<string>,
  store?: StoreApi,
): Promise<number | undefined> {
  const dependencies = getBlockDependencies(files, state.allBlockNeeded);
  const pendingBlocks = files.flatMap((file) => file.blocks);

  while (true) {
    const pending = pendingBlocks.filter((block) => !state.blocksDone.has(block));
    if (pending.length === 0) {
      return undefined;
    }

    const ready = pending.filter((block) => {
      const blockDependencies = dependencies.get(block);
      if (!blockDependencies || blockDependencies.size === 0) {
        return true;
      }
      for (const dependency of blockDependencies) {
        if (!state.blocksDone.has(dependency)) {
          return false;
        }
      }
      return true;
    });

    const doneBeforeBatch = new Set(state.blocksDone);
    // When no block is dependency-ready, run a single pending block and let
    // runBlock resolve its needs recursively. Scheduling several blocked
    // blocks at once can start the same dependency path multiple times.
    const batch = ready.length
      ? ready.slice(0, threads)
      : pending.slice(0, 1);
    await Promise.all(
      batch.map((block) => runScheduledBlock(block, globalData, state, store)),
    );

    const completedInBatch = [...state.blocksDone].filter(
      (block) => !doneBeforeBatch.has(block),
    );
    for (const block of completedInBatch) {
      incrementCounters(block, state.counts, store);
      markFileDoneIfNeeded(block, state, store);
    }

    if (failFast && state.counts.failedBlocks) {
      const failedBlock = completedInBatch.find((block) => block.meta._isFailedBlock)
        || batch.find((block) => block.meta._isFailedBlock);
      const status = failedBlock?.actualResponse?.status || 1;
      store?.getState().addMessage("error", `\nFAIL FAST: exiting with status ${status}`);
      store?.getState().setResult(status, [...onlyMode]);
      return status;
    }
  }
}

async function runBlocksSequentially(
  files: File[],
  globalData: GlobalData,
  state: RunnerState,
  failFast: boolean,
  onlyMode: Set<string>,
  store?: StoreApi,
): Promise<number | undefined> {
  for (const file of files) {
    const relativePath = file.relativePath || "";

    let isFirstBlock = true;
    for (const block of file.blocks) {
      if (state.blocksDone.has(block)) continue;

      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = isFirstBlock;
      if (isFirstBlock) {
        isFirstBlock = false;
      }

      if (!state.filesMarkedRunning.has(relativePath)) {
        state.filesMarkedRunning.add(relativePath);
        store?.getState().setFileStatus(relativePath, "running");
      }

      await runBlock(
        block,
        globalData,
        relativePath,
        state.blocksDone,
        state.allBlockNeeded,
        store,
      );

      incrementCounters(block, state.counts, store);
      markFileDoneIfNeeded(block, state, store);

      if (failFast && state.counts.failedBlocks) {
        const status = block.actualResponse?.status || 1;
        store?.getState().addMessage("error", `\nFAIL FAST: exiting with status ${status}`);
        store?.getState().setResult(status, [...onlyMode]);
        return status;
      }
    }
  }

  return undefined;
}

export async function runner(
  filePaths: string[],
  defaultMeta: Meta,
  failFast = false,
  store?: StoreApi
): Promise<{
  files: File[];
  exitCode: number;
  onlyMode: Set<string>;
  blocksDone: Set<Block>;
}> {
  const blocksDone = new Set<Block>();
  const threads = getThreads(defaultMeta);

  const onlyMode = new Set<string>();
  const mustBeImported = new Set<string>();

  const files: File[] = await filePathsToFiles(filePaths);

  const globalData: GlobalData = {
    meta: {
      ...defaultMeta,
      get ignore() {
        return undefined;
        // do not save ignore in global meta
      },
      get only() {
        // do not save only in global meta
        return undefined;
      },
      get id() {
        // do not save id in global meta
        return undefined;
      },
      get description() {
        // do not save description in global meta
        return undefined;
      },
    },
    _files: files,
    _blocksDone: {},
    _blocksAlreadyReferenced: new Set<Block>(),
  };

  store?.getState().setPhase("parsing");

  // parse all metadata first

  const allPathFilesImported = new Set<string>();
  try {
    await processMetadata(
      files,
      globalData,
      onlyMode,
      mustBeImported,
      blocksDone,
      allPathFilesImported
    );
  } catch (error) {
    console.error(`Error while parsing metadata:`);
    console.error((error as Error).message);
    store?.getState().addMessage("error", `Error while parsing metadata: ${(error as Error).message}`);
    return { files, exitCode: 1, onlyMode, blocksDone };
  }

  store?.getState().setPhase("running");

  if (onlyMode.size) {
    for (const file of files) {
      for (const block of file.blocks) {
        if (!block.meta.only) {
          block.meta.ignore = true;
        } else {
          block.meta.ignore = undefined;
        }
      }
    }
  }

  // look for all blocks needed
  const allIdsNeeded = new Set<string>();
  for (const file of files) {
    for (const block of file.blocks) {
      if (block.meta.needs) {
        allIdsNeeded.add(block.meta.needs);
      }
    }
  }
  const allBlockNeeded = new Map<string, Block>();
  for (const file of files) {
    for (const block of file.blocks) {
      if (allIdsNeeded.has(block.meta.id)) {
        allBlockNeeded.set(block.meta.id, block);
        block.meta.ignore = false;
      }
    }
  }

  // Pre-register all files and blocks so the display can show them upfront
  const fileBlockTotals = new Map<string, number>();
  for (const file of files) {
    const relativePath = file.relativePath || "";
    fileBlockTotals.set(relativePath, file.blocks.length);
    store?.getState().addFile(file.path, relativePath);
    let preIsFirst = true;
    for (const block of file.blocks) {
      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = preIsFirst;
      const blockId = block.blockLink;
      store?.getState().addBlock(blockId, {
        description: block.description,
        blockLink: block.blockLink,
        filePath: relativePath,
        status: "pending",
        startTime: 0,
        isFirstBlock: preIsFirst,
        meta: serializeMeta(block.meta),
      });
      store?.getState().addFileBlockId(relativePath, blockId);
      preIsFirst = false;
    }
  }

  const state: RunnerState = {
    blocksDone,
    allBlockNeeded,
    counts: {
      successfulBlocks: 0,
      failedBlocks: 0,
      ignoredBlocks: 0,
    },
    fileBlockTotals,
    fileBlocksDone: new Map<string, number>(),
    filesMarkedRunning: new Set<string>(),
  };

  // Pre-mark all ignored blocks as done before running any other block
  for (const file of files) {
    for (const block of file.blocks) {
      if (block.meta.ignore) {
        block.meta._isIgnoredBlock = true;
        addToDone(blocksDone, block);
        const blockId = block.blockLink;
        store?.getState().updateBlock(blockId, { status: "ignored", elapsedTime: 0, completedAt: Date.now() });
        incrementCounters(block, state.counts, store);
        markFileDoneIfNeeded(block, state, store);
      }
    }
  }

  const failFastExitCode = threads === 1
    ? await runBlocksSequentially(
      files,
      globalData,
      state,
      failFast,
      onlyMode,
      store,
    )
    : await runBlocksWithScheduler(
      files,
      globalData,
      state,
      threads,
      failFast,
      onlyMode,
      store,
    );

  if (failFastExitCode !== undefined) {
    return {
      files,
      exitCode: failFastExitCode,
      onlyMode,
      blocksDone,
    };
  }

  const totalBlockRun = state.counts.successfulBlocks + state.counts.failedBlocks;
  const exitCode =
    state.counts.failedBlocks > 0 ? state.counts.failedBlocks : totalBlockRun === 0 ? 1 : 0;

  store?.getState().setResult(exitCode, [...onlyMode]);
  globalData._blocksDone = {}; // clean up blocks referenced
  return { files, exitCode, onlyMode, blocksDone };
}

function addToDone(blocksDone: Set<Block>, block: Block) {
  if (blocksDone.has(block)) {
    throw new Error("Block already done: " + block.description);
  }
  if (block.meta._isDoneBlock) {
    throw new Error("Block already _isDoneBlock");
  }
  block.meta._isDoneBlock = true;
  blocksDone.add(block);
}

async function runBlock(
  block: Block,
  globalData: GlobalData,
  currentFilePath: string,
  blocksDone: Set<Block>,
  allBlockNeeded: Map<string, Block>,
  store?: StoreApi
): Promise<Set<Block>> {
  if (blocksDone.has(block)) {
    return blocksDone;
  }
  const blockId = block.blockLink || `${block.meta._relativeFilePath}:${block.meta._startLine}`;
  const sourceFilePath = block.meta._relativeFilePath || currentFilePath;
  const isDifferentFile = sourceFilePath !== currentFilePath;
  store?.getState().addBlock(blockId, {
    description: block.description,
    blockLink: block.blockLink,
    filePath: sourceFilePath,
    status: "pending",
    startTime: Date.now(),
    isFirstBlock: !!block.meta._isFirstBlock,
    displayMode: block.meta.display,
    neededFrom: isDifferentFile ? currentFilePath : undefined,
    meta: serializeMeta(block.meta),
  });
  store?.getState().addFileBlockId(sourceFilePath, blockId);
  const spinner = { start: () => {}, update: () => {}, pass: () => {}, fail: () => {}, ignore: () => {}, empty: () => {}, clear: () => {} };

  try {
    if (block.meta.needs && !block.meta.ignore) {
      const blockNeeded = allBlockNeeded.get(block.meta.needs);
      if (!blockNeeded) {
        throw new Error(`Block needed not found: ${block.meta.needs}`);
      }
      if (
        !blockNeeded.meta._isDoneBlock &&
        globalData._blocksAlreadyReferenced.has(blockNeeded)
      ) {
        // Evict infinity loop
        throw new Error(
          `Infinite loop looking for needed blocks -> ${block.description} needs ${block.meta.needs}`
        );
      }
      globalData._blocksAlreadyReferenced.add(blockNeeded);

      await runBlock(
        blockNeeded,
        globalData,
        currentFilePath,
        blocksDone,
        allBlockNeeded,
        store
      );

      if (blocksDone.has(block)) {
        return blocksDone;
      }
    }

    block.meta = {
      ...globalData.meta,
      ...block.meta,
    };
    spinner.start();
    store?.getState().updateBlock(blockId, { status: "running", startTime: Date.now() });
    try {
      block.request = await parseRequestFromText(block, {
        ...globalData._blocksDone,
        ...block,
        ...assertions,
      });
    } catch (error) {
      if (block.meta.ignore) {
        // should not fail if ignored
      } else {
        (error as Error).message = `Error while parsing request: ${
          (error as Error).message
        }`;
        throw error;
      }
    }

    spinner.update();

    if (block.meta._isFirstBlock && !block.request) {
      globalData.meta = { ...globalData.meta, ...block.meta };
    }

    if (block.meta.ignore) {
      block.meta._isIgnoredBlock = true;
      addToDone(blocksDone, block);
      spinner.ignore();
      updateBlockFinished(store, blockId, { status: "ignored" });
      return blocksDone;
    }

    if (!block.request) {
      if (block.meta._isFirstBlock) {
        spinner.clear();
      } else {
        spinner.empty();
      }
      block.meta._isEmptyBlock = true;
      addToDone(blocksDone, block);
      updateBlockFinished(store, blockId, { status: "empty" });
      return blocksDone;
    }

    if (block.error) {
      throw block.error;
    }

    await fetchBlock(block);

    try {
      block.expectedResponse = await parseResponseFromText(block.text, {
        ...globalData._blocksDone,
        ...block,
        ...assertions,
        body: await block.actualResponse?.getBody(),
        // body: block.body,
        response: block.response,
      });
    } catch (error) {
      // Early throw for the general case
      if (
        block.text.match(/HTTP\/1\.1 \d{3}/) ||
        block.text.match(/HTTP\/2 \d{3}/)
      ) {
        (error as Error).message = `Error while parsing response: ${
          (error as Error).message
        }`;
        throw error;
      }

      // Special case: HTTP/1.1 without status code
      if (error instanceof RangeError) {
        block.expectedResponse = undefined;
        // Allow HTTP/1.1 and HTTP/2 without a status code
        // No throw here
      } else {
        (error as Error).message = `Error while parsing response: ${
          (error as Error).message
        }`;
        throw error;
      }
    }

    if (block.expectedResponse) {
      await assertResponse(block);
    }

    block.meta._isSuccessfulBlock = true;
    spinner.pass();
    updateBlockFinished(store, blockId, {
      status: "passed",
      httpStatus: block.actualResponse?.status,
    });
    addToDone(blocksDone, block);
    return blocksDone;
  } catch (error) {
    block.error = error as Error;
    block.meta._isFailedBlock = true;
    spinner.fail();
    const err = error as Error;
    updateBlockFinished(store, blockId, {
      status: "failed",
      httpStatus: block.actualResponse?.status,
      error: { name: err.name, message: err.message, cause: err.cause ? String(err.cause) : undefined },
      failureContext: deriveFailureContext(block, err),
      sourceText: block.text,
      sourceStartLine: (block.meta._startLine ?? 0) + 1,
      sourceEndLine: (block.meta._endLine ?? 0) + 1,
    });
    addToDone(blocksDone, block);
    return blocksDone;
  } finally {
    // Serialize request/response into store after bodies are available
    if (store && block.request) {
      store.getState().updateBlock(blockId, { request: serializeRequest(block.request) });
    }
    if (store && block.actualResponse) {
      serializeResponse(block.actualResponse).then((res) => {
        store.getState().updateBlock(blockId, { actualResponse: res });
      }).catch(() => {});
    }
    if (store && block.expectedResponse) {
      serializeResponse(block.expectedResponse).then((res) => {
        store.getState().updateBlock(blockId, { expectedResponse: res });
      }).catch(() => {});
    }
    await consumeBodies(block);

    if (block.meta.id) {
      const name = block.meta.id as string;
      block.body = await block.actualResponse?.getBody();
      globalData._blocksDone[name] = block;
    }
  }
}

async function processMetadata(
  files: File[],
  globalData: GlobalData,
  onlyMode: Set<string>,
  mustBeImported: Set<string>,
  blocksDone: Set<Block>,
  allPathFilesImported: Set<string>
) {
  for (const file of files) {
    if (allPathFilesImported.has(file.path)) {
      // evict infinity loop
      throw new Error(`Infinite loop looking for imports -> ${file.path}`);
    }
    file.relativePath = "./" + relative(process.cwd(), file.path);
    for (const block of file.blocks) {
      try {
        const meta = await parseMetaFromText(block.text, {
          ...globalData,
          ...block,
          ...assertions,
        });
        block.meta._relativeFilePath ??= file.relativePath;
        block.meta = {
          ...globalData.meta,
          ...block.meta,
          ...meta,
        };
        if (block.meta.only) {
          onlyMode.add(
            `${block.meta._relativeFilePath}:${block.meta._startLine}`
          );
        }
        if (block.meta.import) {
          if (isAbsolute(block.meta.import)) {
            mustBeImported.add(block.meta.import);
          } else {
            mustBeImported.add(resolve(dirname(file.path), block.meta.import));
          }
        }
      } catch (_error) {
        const error = _error as Error;
        (error as Error).message = `Error parsing metadata: ${
          (error as Error).message
        }`;
        block.error = error;
        block.meta._isFailedBlock = true;
      }
    }
    allPathFilesImported.add(file.path);
  }
  // meta.import logic
  // TODO support for import globs for example -> import: ./src/*.http ./test/*.http
  if (mustBeImported.size > 0) {
    const allAbsolutePaths = files.map((f) => f.path);
    const needsImport = Array.from(mustBeImported).filter(
      (path) => !allAbsolutePaths.includes(path)
    );

    const newFiles = await filePathsToFiles(needsImport);
    const _mustBeImported = new Set<string>();
    await processMetadata(
      newFiles,
      globalData,
      onlyMode,
      _mustBeImported,
      blocksDone,
      allPathFilesImported
    );
    files.unshift(...newFiles);
    files.sort((file) => (mustBeImported.has(file.path) ? -1 : 1));
  }
}
