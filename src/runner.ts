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
import type { StoreApi } from "./ui/store.ts";
import { serializeMeta, serializeRequest, serializeResponse } from "./ui/serialize.ts";
import { deriveFailureContext } from "./failureContext.ts";

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
  let successfulBlocks = 0;
  let failedBlocks = 0;
  let ignoredBlocks = 0;
  const blocksDone = new Set<Block>();

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
  for (const file of files) {
    const relativePath = file.relativePath || "";
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

  for (const file of files) {
    const relativePath = file.relativePath || "";
    store?.getState().setFileStatus(relativePath, "running");
    let _isFirstBlock = true;
    for (const block of file.blocks) {
      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = _isFirstBlock;
      if (_isFirstBlock) {
        _isFirstBlock = false;
      }

      await runBlock(
        block,
        globalData,
        relativePath,
        blocksDone,
        allBlockNeeded,
        store
      );
      if (block.meta._isIgnoredBlock) {
        ignoredBlocks++;
        store?.getState().incrementIgnore();
      }
      if (block.meta._isFailedBlock) {
        failedBlocks++;
        store?.getState().incrementFail();
      }
      if (block.meta._isSuccessfulBlock) {
        successfulBlocks++;
        store?.getState().incrementSuccess();
      }

      if (failFast && failedBlocks) {
        const status = block.actualResponse?.status || 1;
        store?.getState().addMessage("error", `\nFAIL FAST: exiting with status ${status}`);
        store?.getState().setResult(status, [...onlyMode]);
        return {
          files,
          exitCode: status,
          onlyMode,
          blocksDone,
        };
      }
    }
    store?.getState().setFileStatus(relativePath, "done");
  }

  const totalBlockRun = successfulBlocks + failedBlocks;
  const exitCode =
    failedBlocks > 0 ? failedBlocks : totalBlockRun === 0 ? 1 : 0;

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
      store?.getState().updateBlock(blockId, { status: "ignored", elapsedTime: Date.now() - (store.getState().blocks[blockId]?.startTime ?? Date.now()) });
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
      store?.getState().updateBlock(blockId, { status: "empty" });
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
    store?.getState().updateBlock(blockId, {
      status: "passed",
      elapsedTime: Date.now() - (store.getState().blocks[blockId]?.startTime ?? Date.now()),
      httpStatus: block.actualResponse?.status,
    });
    addToDone(blocksDone, block);
    return blocksDone;
  } catch (error) {
    block.error = error as Error;
    block.meta._isFailedBlock = true;
    spinner.fail();
    const err = error as Error;
    store?.getState().updateBlock(blockId, {
      status: "failed",
      elapsedTime: Date.now() - (store.getState().blocks[blockId]?.startTime ?? Date.now()),
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
