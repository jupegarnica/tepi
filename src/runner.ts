import { filePathsToFiles } from "./files.ts";
import { Block, File, GlobalData, Meta } from "./types.ts";
import { consumeBodies, fetchBlock } from "./fetchBlock.ts";
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.160.0/fmt/colors.ts";
import { relative, isAbsolute, resolve, dirname } from "https://deno.land/std@0.160.0/path/posix.ts";
import { getDisplayIndex, printBlock, printErrorsSummary, logPath, Logger, logBlock } from "./print.ts";
import { ms } from "https://deno.land/x/ms@v0.1.0/ms.ts";
// import ms from "npm:ms";
import {
  parseMetaFromText,
  parseRequestFromText,
  parseResponseFromText,
} from "./parser.ts";
import * as assertions from "https://deno.land/std@0.160.0/testing/asserts.ts";

export async function runner(
  filePaths: string[],
  defaultMeta: Meta,
  failFast = false,
): Promise<{ files: File[]; exitCode: number; onlyMode: Set<string>, blocksDone: Set<Block> }> {


  let successfulBlocks = 0;
  let failedBlocks = 0;
  let ignoredBlocks = 0;
  const blocksDone = new Set<Block>();
  const startGlobalTime = Date.now();

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
    },
    _files: files,
    _blocksDone: {},
    _blocksAlreadyReferenced: new Set<Block>(),
  };


  // parse all metadata first
  try {
    await processMetadata(files, globalData, onlyMode, mustBeImported, blocksDone);
  } catch (error) {
    console.error(`Error while parsing metadata`);
    console.error(error.message);
    return { files, exitCode: 1, onlyMode, blocksDone };
  }


  if (onlyMode.size) {
    for (const file of files) {
      for (const block of file.blocks) {
        if (!block.meta.only) {
          block.meta.ignore = true;
        }
      }
    }
  }

  for (const file of files) {
    const relativePath = file.relativePath || '';
    const path = fmt.dim(`running ${relativePath}`);
    const displayIndex = getDisplayIndex(defaultMeta);
    const pathSpinner = logPath(path, displayIndex);
    let _isFirstBlock = true;
    for (const block of file.blocks) {
      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = _isFirstBlock;
      if (_isFirstBlock) {
        _isFirstBlock = false;
      }
      await runBlock(block, globalData, relativePath, blocksDone);
      if (block.meta._isIgnoredBlock) {
        ignoredBlocks++;
      }
      if (block.meta._isFailedBlock) {
        failedBlocks++;
      }
      if (block.meta._isSuccessfulBlock) {
        successfulBlocks++;
      }

      if (failFast && failedBlocks) {
        if (getDisplayIndex(defaultMeta) !== 0) {
          printErrorsSummary(blocksDone);
        }
        const status = block.actualResponse?.status || 1;
        console.error(fmt.red(`\nFAIL FAST: exiting with status ${status}`));
        return {
          files,
          exitCode: status,
          onlyMode,
          blocksDone
        };
      }
    }
    pathSpinner?.stop();
    pathSpinner?.clear();
  }
  if (getDisplayIndex(defaultMeta) !== 0) {
    printErrorsSummary(blocksDone);

    const statusText = failedBlocks
      ? fmt.bgRed(" FAIL ")
      : fmt.bgBrightGreen(" PASS ");

    const totalBlocks = successfulBlocks + failedBlocks + ignoredBlocks;
    const elapsedGlobalTime = Date.now() - startGlobalTime;
    const prettyGlobalTime = fmt.dim(`(${ms(elapsedGlobalTime)})`);
    console.info();
    console.info(
      fmt.bold(`${statusText}`),
      `${fmt.white(String(totalBlocks))} tests, ${fmt.green(String(successfulBlocks))
      } passed, ${fmt.red(String(failedBlocks))} failed, ${fmt.yellow(String(ignoredBlocks))
      } ignored ${prettyGlobalTime}`,
    );
  }
  globalData._blocksDone = {}; // clean up blocks referenced
  return { files, exitCode: failedBlocks, onlyMode, blocksDone };
}

function addToDone(blocksDone: Set<Block>, block: Block) {
  if (blocksDone.has(block)) {
    console.trace("Block already done: " + block.description);
    throw new Error("Block already done: " + block.description);

  }
  if (block.meta._isDoneBlock) {
    console.trace("Block already _isDoneBlock: " + block.description);
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
): Promise<Set<Block>> {
    if (blocksDone.has(block)) {
      return blocksDone;
    }

    let spinner: Logger | undefined;
    try {
      if (block.meta.ignore && !block.meta._isEmptyBlock) {
        block.meta._isIgnoredBlock = true;
        addToDone(blocksDone, block);
        logBlock(block, currentFilePath, globalData.meta).ignore();
        return blocksDone;
      }

      if (block.meta.needs) {
        const blockReferenced = globalData._files.flatMap((file) => file.blocks)
          .find((b) => b.meta.id === block.meta.needs);
        if (!blockReferenced) {
          logBlock(block, currentFilePath, globalData.meta).fail();
          throw new Error(`Block needed not found: ${block.meta.needs}`);
        } else {
          // Evict infinity loop
          if (!globalData._blocksAlreadyReferenced.has(blockReferenced)) {
            globalData._blocksAlreadyReferenced.add(blockReferenced);
            await runBlock(blockReferenced, globalData, currentFilePath, blocksDone);
          } else {
            throw new Error(`Infinite loop looking for needed blocks -> ${block.description} needs ${block.meta.needs}`);
          }
        }
      }
      if (blocksDone.has(block)) return blocksDone;

      spinner = logBlock(block, currentFilePath, globalData.meta);


      block.meta = {
        ...globalData.meta,
        ...block.meta,
      };

      block.request = await parseRequestFromText(block, {
        ...globalData._blocksDone,
        ...block,
        ...assertions,
      });

      spinner.update();


      if (block.meta._isFirstBlock && !block.request) {
        globalData.meta = { ...globalData.meta, ...block.meta };
      }

      if (!block.request) {
        spinner.empty();
        addToDone(blocksDone, block);
        block.meta._isEmptyBlock = true;
        return blocksDone;
      }


      if (block.error) {
        throw block.error;
      }

      await fetchBlock(block);

      block.expectedResponse = await parseResponseFromText(
        block.text,
        {
          ...globalData._blocksDone,
          ...block,
          ...assertions,
          body: await block.actualResponse?.getBody(),
          // body: block.body,
          response: block.response,
        },
      );

      if (block.expectedResponse) {
        await assertResponse(block);
      }

      block.meta._isSuccessfulBlock = true;
      spinner.pass();
      addToDone(blocksDone, block);
      return blocksDone;
    } catch (error) {
      block.error = error;
      block.meta._isFailedBlock = true;
      spinner?.fail();
      addToDone(blocksDone, block);
      return blocksDone;
    } finally {
      await printBlock(block);
      await consumeBodies(block);


      if (block.meta.id) {
        const name = block.meta.id as string;
        block.body = await block.actualResponse?.getBody();
        globalData._blocksDone[name] = block;
      }
    }
}




async function processMetadata(files: File[], globalData: GlobalData, onlyMode: Set<string>, mustBeImported: Set<string>, blocksDone: Set<Block>) {
  for (const file of files) {
    file.relativePath = './' + relative(Deno.cwd(), file.path);
    for (const block of file.blocks) {
      try {
        const meta = await parseMetaFromText(block.text, {
          ...globalData,
          ...block,
          ...assertions,
        });
        block.meta._relativeFilePath ??= file.relativePath;

        if (meta.only) {
          onlyMode.add(
            `${block.meta._relativeFilePath}:${block.meta._startLine}`
          );
        }
        if (meta.import) {
          if (isAbsolute(meta.import)) {
            mustBeImported.add(meta.import);
          } else {
            mustBeImported.add(resolve(dirname(file.path), meta.import));
          }
        }
        block.meta = {
          ...globalData.meta,
          ...block.meta,
          ...meta,
        };
      } catch (error) {
        block.error = error;
        block.meta._isFailedBlock = true;
      }
    }
  }
  // meta.import logic
  // TODO support for import globs for example -> import: ./src/*.http ./test/*.http
  if (mustBeImported.size > 0) {
    const allAbsolutePaths = files.map((f) => f.path);
    const needsImport = Array.from(mustBeImported).filter(
      (path) => !allAbsolutePaths.includes(path),
    );
    const newFiles = await filePathsToFiles(needsImport);
    const _mustBeImported = new Set<string>();
    await processMetadata(newFiles, globalData, onlyMode, _mustBeImported, blocksDone);
    files.unshift(...newFiles);
    files.sort(file => mustBeImported.has(file.path) ? -1 : 1)
  }
}