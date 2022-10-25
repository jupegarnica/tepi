import { filePathsToFiles } from "./filePathsToFiles.ts";
import { Block, File, GlobalData, Meta } from "./types.ts";
import { consumeBodies, fetchBlock } from "./fetchBlock.ts";
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";
import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { printBlock, printErrorsSummary } from "./print.ts";
// import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import ms from "npm:ms";
import {
  parseMetaFromText,
  parseRequestFromText,
  parseResponseFromText,
} from "./parseBlockText.ts";
import * as assertions from "https://deno.land/std@0.160.0/testing/asserts.ts";
const noop = (..._: unknown[]): void => { };

export async function runner(
  filePaths: string[],
  defaultMeta: Meta,
  failFast = false,
): Promise<{ files: File[]; exitCode: number, onlyMode: boolean }> {

  const files: File[] = await filePathsToFiles(filePaths);
  let successfulBlocks = 0;
  let failedBlocks = 0;
  let ignoredBlocks = 0;
  const blocksDone: Block[] = [];
  const startGlobalTime = Date.now();
  const globalData: GlobalData = {
    meta: {
      ...defaultMeta,
      set ignore(_: unknown) {
        // do not save ignore in global meta
      },
      set only(_: unknown) {
        // do not save only in global meta
      }
    },
    _files: files,
    _blocksDone: {},
    _blocksAlreadyReferenced: {},
  };

  let onlyMode = false;
  // parse all metadata first
  for (const file of files) {
    for (const block of file.blocks) {
      try {
        const meta = await parseMetaFromText(block.text, {
          ...globalData,
          ...block,
          ...assertions,
        });
        if (meta.only) {
          onlyMode = true;
        }
        block.meta = {
          ...globalData.meta,
          ...block.meta,
          ...meta,
        };
      } catch (error) {
        block.error = error;
        block.meta.isErrorBlock = true;
      }
    }
  }

  if (onlyMode) {
    for (const file of files) {
      for (const block of file.blocks) {
        if (!block.meta.only) {
          block.meta.ignore = true;
        }
      }
    }
  }

  for (const file of files) {
    const relativePath = relative(Deno.cwd(), file.path);
    const path = fmt.dim(`running ${relativePath}`);
    let pathSpinner;

    if ((defaultMeta?.displayIndex as number) === 0) {
      // display none
    } else if ((defaultMeta?.displayIndex as number) === 1) {
      pathSpinner = wait({ text: path });
      pathSpinner.start();
    } else {
      console.info(path);
    }

    let isFirstBlock = true;
    for (const block of file.blocks) {
      block.meta.relativeFilePath = relativePath;
      block.meta.isFirstBlock = isFirstBlock;
      if (isFirstBlock) {
        isFirstBlock = false;
      }
      const [...blocks] = await runBlock(block, globalData);
      blocksDone.push(...blocks);

      if (block.meta.isIgnoredBlock) {
        ignoredBlocks++;
      }
      if (block.meta.isFailedBlock) {
        failedBlocks++;
      }
      if (block.meta.isSuccessfulBlock) {
        successfulBlocks++;
      }

      if (failFast && failedBlocks) {
        if (defaultMeta?.displayIndex !== 0) {
          printErrorsSummary(blocksDone);
        }
        const status = block.actualResponse?.status || 1;
        console.error(fmt.red(`\nFAIL FAST: exiting with status ${status}`));
        Deno.exit(status);
      }
    }

    pathSpinner?.stop();
    pathSpinner?.clear();
  }
  if ((defaultMeta?.displayIndex as number) !== 0) {
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
  return { files, exitCode: failedBlocks, onlyMode };
}

async function runBlock(
  block: Block,
  globalData: GlobalData,
): Promise<Block[]> {
  const startTime = Date.now();
  let spinner;
  const blocksDone = [block];
  if (block.meta.isDoneBlock) {
    return [];
  }
  try {

    if (block.meta.ref) {
      const blockReferenced = globalData._files.flatMap((file) => file.blocks)
        .find((b) => b.meta.name === block.meta.ref);
      if (!blockReferenced) {
        // TODO thinks about this. maybe not throw error?
        throw new Error(`Block referenced not found: ${block.meta.ref}`);
      } else {
        // Evict infinity loop
        if (
          globalData
            ._blocksAlreadyReferenced[blockReferenced.meta.name as string]
        ) {
          return [];
          // throw new Error(`Block referenced already referenced: ${block.meta.ref}`);
        }
        globalData._blocksAlreadyReferenced[block.meta.ref as string] =
          blockReferenced;
        const [...blocks] = await runBlock(blockReferenced, globalData);
        blocksDone.push(...blocks);
      }
    }
    block.meta = {
      ...globalData.meta,
      ...block.meta,
    };

    block.request = await parseRequestFromText(block, {
      ...globalData._blocksDone,
      ...block,
      ...assertions,
    });

    if (block.meta.isFirstBlock && !block.request) {
      globalData.meta = { ...globalData.meta, ...block.meta };
    }

    if (!block.request) {
      block.meta.isEmptyBlock = true;
      return blocksDone;
    }

    block.description = block.meta.name as string ||
      `${block.request?.method} ${block.request?.url}`;

    if ((block.meta.displayIndex as number) >= 2) {
      spinner = wait({
        prefix: fmt.dim("-"),
        text: fmt.white(block.description),
        color: "cyan",
        spinner: "dots4",
        interval: 200,
        discardStdin: true,
      });
    } else {
      spinner = {
        start: noop,
        stopAndPersist: noop,
        update: noop,
      };
    }

    spinner?.start();


    if (block.meta.ignore) {
      block.meta.isIgnoredBlock = true;
      spinner?.stopAndPersist({
        symbol: fmt.yellow("-"),
        text: fmt.yellow(block.description),
      });
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
        response: block.actualResponse,
      },
    );
    block.response = block.actualResponse;

    if (block.expectedResponse) {
      await assertResponse(block);
    }

    const elapsedTime = Date.now() - startTime;
    block.meta.elapsedTime = elapsedTime;

    spinner?.stopAndPersist({
      symbol: fmt.green("✔"),
      text: fmt.green(block.description) + fmt.dim(` ${elapsedTime}ms`),
    });

    block.meta.isSuccessfulBlock = true;
    return blocksDone;
  } catch (error) {
    block.error = error;

    const elapsedTime = Date.now() - startTime;
    block.meta.elapsedTime = elapsedTime;
    const prettyTime = fmt.dim(` ${ms(elapsedTime)}`);
    spinner?.stopAndPersist({
      symbol: fmt.brightRed("✖"),
      text: fmt.red(block.description || "") + prettyTime,
    });
    block.meta.isFailedBlock = true;
    return blocksDone;
  } finally {
    await printBlock(block);

    await consumeBodies(block);
    block.meta.isDoneBlock = true;
    if (block.meta.name) {
      const name = block.meta.name as string;
      globalData._blocksDone[name] = block;
    }
  }
}
