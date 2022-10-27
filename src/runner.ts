import { filePathsToFiles } from "./files.ts";
import { Block, File, GlobalData, Meta } from "./types.ts";
import { consumeBodies, fetchBlock } from "./fetchBlock.ts";
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.160.0/fmt/colors.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";
import { relative } from "https://deno.land/std@0.160.0/path/posix.ts";
import { getDisplayIndex, printBlock, printErrorsSummary } from "./print.ts";
import { ms } from "https://deno.land/x/ms@v0.1.0/ms.ts";
// import ms from "npm:ms";
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
): Promise<{ files: File[]; exitCode: number; onlyMode: string[] }> {
  const files: File[] = await filePathsToFiles(filePaths);
  let successfulBlocks = 0;
  let failedBlocks = 0;
  let ignoredBlocks = 0;
  const blocksDone: Block[] = [];
  const startGlobalTime = Date.now();
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
    _blocksAlreadyReferenced: {},
  };

  const onlyMode = [];
  // parse all metadata first
  for (const file of files) {
    file.relativePath = relative(Deno.cwd(), file.path);

    for (const block of file.blocks) {
      try {
        const meta = await parseMetaFromText(block.text, {
          ...globalData,
          ...block,
          ...assertions,
        });
        block.meta._relativeFilePath ??= file.relativePath;
        if (meta.only) {
          onlyMode.push(
            `${block.meta._relativeFilePath}:${block.meta._startLine}`,
          );
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

  if (onlyMode.length) {
    for (const file of files) {
      for (const block of file.blocks) {
        if (!block.meta.only) {
          block.meta.ignore = true;
        }
      }
    }
  }

  for (const file of files) {
    const relativePath = file.relativePath;
    const path = fmt.dim(`running ${relativePath}`);
    let pathSpinner;

    if (getDisplayIndex(defaultMeta) === 0) {
      // display none
    } else if (getDisplayIndex(defaultMeta) === 1) {
      pathSpinner = wait({ text: path });
      pathSpinner.start();
    } else {
      console.info(path);
    }

    let _isFirstBlock = true;
    for (const block of file.blocks) {
      block.meta._relativeFilePath = relativePath;
      block.meta._isFirstBlock = _isFirstBlock;
      if (_isFirstBlock) {
        _isFirstBlock = false;
      }
      const [...blocks] = await runBlock(block, globalData);
      blocksDone.push(...blocks);

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
        Deno.exit(status);
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
  return { files, exitCode: failedBlocks, onlyMode };
}

async function runBlock(
  block: Block,
  globalData: GlobalData,
): Promise<Block[]> {
  const startTime = Date.now();
  let spinner;
  const blocksDone = [block];
  if (block.meta._isDoneBlock) {
    return [];
  }
  try {
    if (getDisplayIndex(block.meta) >= 2) {
      spinner = wait({
        prefix: fmt.dim("-"),
        text: fmt.dim(block.description),
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
        text: '',
      };
    }
    if (block.meta.ref) {
      const blockReferenced = globalData._files.flatMap((file) => file.blocks)
        .find((b) => b.meta.name === block.meta.ref);
      if (!blockReferenced) {
        spinner?.start();
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
    spinner.text = fmt.white(block.description);
    if (block.meta._isFirstBlock && !block.request) {
      globalData.meta = { ...globalData.meta, ...block.meta };
    }

    if (!block.request) {
      block.meta._isEmptyBlock = true;
      return blocksDone;
    }



    spinner?.start();

    if (block.meta.ignore) {
      block.meta._isIgnoredBlock = true;
      spinner?.stopAndPersist({
        symbol: fmt.yellow(""),
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
        body: await block.actualResponse?.getBody(),
        // body: block.body,
        response: block.response,

      },
    );

    if (block.expectedResponse) {
      await assertResponse(block);
    }

    const _elapsedTime = Date.now() - startTime;
    block.meta._elapsedTime = _elapsedTime;

    spinner?.stopAndPersist({
      symbol: fmt.green("✓"),
      text: fmt.green(block.description) + fmt.dim(` ${ms(_elapsedTime)}`),
    });

    block.meta._isSuccessfulBlock = true;
    return blocksDone;
  } catch (error) {
    block.error = error;

    const _elapsedTime = Date.now() - startTime;
    block.meta._elapsedTime = _elapsedTime;

    const prettyTime = fmt.dim(` ${ms(_elapsedTime)}`);
    spinner?.stopAndPersist({
      symbol: fmt.brightRed("✖"),
      text: fmt.red(block.description || "") + prettyTime,
    });

    block.meta._isFailedBlock = true;
    return blocksDone;
  } finally {
    await printBlock(block);

    await consumeBodies(block);
    block.meta._isDoneBlock = true;
    if (block.meta.name) {
      const name = block.meta.name as string;
      block.body = await block.actualResponse?.getBody();
      globalData._blocksDone[name] = block;
    }
  }
}
