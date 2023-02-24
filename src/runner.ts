import { filePathsToFiles } from "./files.ts";
import { Block, File, GlobalData, Meta } from "./types.ts";
import { consumeBodies, fetchBlock } from "./fetchBlock.ts";
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.164.0/fmt/colors.ts";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
} from "https://deno.land/std@0.164.0/path/posix.ts";
import {
  createBlockSpinner,
  getDisplayIndex,
  logPath,
  printBlock,
  printErrorsSummary,
} from "./print.ts";
import { ms } from "https://deno.land/x/ms@v0.1.0/ms.ts";
import {
  parseMetaFromText,
  parseRequestFromText,
  parseResponseFromText,
} from "./parser.ts";
import * as assertions from "https://deno.land/std@0.164.0/testing/asserts.ts";

export async function runner(
  filePaths: string[],
  defaultMeta: Meta,
  failFast = false,
): Promise<
  {
    files: File[];
    exitCode: number;
    onlyMode: Set<string>;
    blocksDone: Set<Block>;
  }
> {
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

  const allPathFilesImported = new Set<string>();
  try {
    await processMetadata(
      files,
      globalData,
      onlyMode,
      mustBeImported,
      blocksDone,
      allPathFilesImported,
    );
  } catch (error) {
    console.error(`Error while parsing metadata:`);
    console.error(error.message);
    return { files, exitCode: 1, onlyMode, blocksDone };
  }





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

  for (const file of files) {
    const relativePath = file.relativePath || "";
    const path = fmt.gray(`running ${relativePath} `);
    const displayIndex = getDisplayIndex(defaultMeta);
    const pathSpinner = logPath(path, displayIndex, defaultMeta._noAnimation);
    let _isFirstBlock = true;
    for (const block of file.blocks) {
      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = _isFirstBlock;
      if (_isFirstBlock) {
        _isFirstBlock = false;
      }

      await runBlock(block, globalData, relativePath, blocksDone, allBlockNeeded);
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
          blocksDone,
        };
      }
    }
    pathSpinner?.stop();
    pathSpinner?.clear();
  }

  const totalBlockRun = successfulBlocks + failedBlocks;
  const exitCode = failedBlocks > 0
    ? failedBlocks
    : totalBlockRun === 0
      ? 1
      : 0;

  if (getDisplayIndex(defaultMeta) !== 0) {
    printErrorsSummary(blocksDone);

    const statusText = exitCode > 0
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
): Promise<Set<Block>> {
  if (blocksDone.has(block)) {
    return blocksDone;
  }
  const spinner = createBlockSpinner(block, currentFilePath, globalData.meta);
  try {
    if (block.meta.needs && !block.meta.ignore) {
      const blockNeeded = allBlockNeeded.get(block.meta.needs)
      if (!blockNeeded) {
        throw new Error(`Block needed not found: ${block.meta.needs}`);
      }
      if (globalData._blocksAlreadyReferenced.has(blockNeeded)) {
        // Evict infinity loop
        throw new Error(
          `Infinite loop looking for needed blocks -> ${block.description} needs ${block.meta.needs}`,
        );
      }
      globalData._blocksAlreadyReferenced.add(blockNeeded);
      // // is needed but ignore in first run? remove it from blockdone
      // TODO: NOT NEEDED FOR NOW?
      // if (blockNeeded.meta._isDoneBlock && blockNeeded.meta.ignore) {
      //   blocksDone.delete(blockNeeded);
      //   blockNeeded.meta._isDoneBlock = false;
      //   blockNeeded.meta.ignore = false; // override ignore if needed
      // }

      await runBlock(
        blockNeeded,
        globalData,
        currentFilePath,
        blocksDone,
        allBlockNeeded,
      );
      if (blocksDone.has(block)) {
        return blocksDone;
      }
    }

    spinner.start();

    block.meta = {
      ...globalData.meta,
      ...block.meta,
    };

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
        error.message = `Error while parsing request: ${error.message}`;
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
      return blocksDone;
    }

    if (block.error) {
      throw block.error;
    }

    await fetchBlock(block);

    try {
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
    } catch (error) {
      error.message = `Error while parsing response: ${error.message}`;
      throw error;
    }

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
    spinner.fail();
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

async function processMetadata(
  files: File[],
  globalData: GlobalData,
  onlyMode: Set<string>,
  mustBeImported: Set<string>,
  blocksDone: Set<Block>,
  allPathFilesImported: Set<string>,
) {
  for (const file of files) {
    if (allPathFilesImported.has(file.path)) {
      // evict infinity loop
      throw new Error(`Infinite loop looking for imports -> ${file.path}`);
    }
    file.relativePath = "./" + relative(Deno.cwd(), file.path);
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
            `${block.meta._relativeFilePath}:${block.meta._startLine}`,
          );
        }
        if (block.meta.import) {
          if (isAbsolute(block.meta.import)) {
            mustBeImported.add(block.meta.import);
          } else {
            mustBeImported.add(resolve(dirname(file.path), block.meta.import));
          }
        }
      } catch (error) {
        error.message = `Error parsing metadata: ${error.message}`;
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
      (path) => !allAbsolutePaths.includes(path),
    );

    const newFiles = await filePathsToFiles(needsImport);
    const _mustBeImported = new Set<string>();
    await processMetadata(
      newFiles,
      globalData,
      onlyMode,
      _mustBeImported,
      blocksDone,
      allPathFilesImported,
    );
    files.unshift(...newFiles);
    files.sort((file) => mustBeImported.has(file.path) ? -1 : 1);
  }
}
