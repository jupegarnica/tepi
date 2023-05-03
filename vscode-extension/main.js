const vscode = require("vscode");

// create a activation function for the extension
// this function is called when the extension is activated

function getTerminal(name) {
  const terminals = vscode.window.terminals;
  for (const terminal of terminals) {
    if (terminal.name === name) {
      return terminal;
    }
  }
  return null;
}

function activate(context) {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("http", { provideCodeLenses }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("tepi.run", (match) => {
      const terminal = getTerminal('tepi') ||
        vscode.window.createTerminal("tepi");
      const path = match.documentFile;
      const fileLine = match.documentLine.lineNumber + 1;
      terminal.sendText(`tepi ${path}:${fileLine}`);
      terminal.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("tepi.run-display-full", (match) => {
      const terminal = getTerminal('tepi') ||
        vscode.window.createTerminal("tepi");
      const path = match.documentFile;
      const fileLine = match.documentLine.lineNumber + 1;
      terminal.sendText(`tepi ${path}:${fileLine} --display full`);
      terminal.show();
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("tepi.help", () => {
      const terminal = getTerminal('tepi') ||
        vscode.window.createTerminal("tepi");
      terminal.sendText(`tepi --help`);
      terminal.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tepi.run-all",
      (match) => {
        const terminal = getTerminal('tepi') ||
          vscode.window.createTerminal("tepi");
        const path = match.documentFile;
        terminal.sendText(`tepi ${path}`);
        terminal.show();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tepi.install",
      () => {
        const terminal = getTerminal('tepi') ||
          vscode.window.createTerminal("tepi");
        terminal.show();
        terminal.sendText(
          `deno install --reload  --unstable --allow-read --allow-env --allow-net --allow-run -f -n tepi https://tepi.deno.dev/src/cli.ts`,
        );
      },
    ),
  );

  // check if tepi is installed using the command line
  // TODO
  // const { exec } = require("node:child_process");
  // console.log("Checking if TEPI is installed");
  // exec("tepi --version", (error, stdout, stderr) => {
  //   console.log({error, stdout, stderr});
  //   if (error) {
  //     console.log("TEPI is not installed");
  //     console.log({error, stdout, stderr});
  //     vscode.window.showErrorMessage(
  //       `TEPI is not installed. Please install it.\n https://tepi.deno.dev`,
  //       {title: "Install", command: "tepi.install"},

  //     );
  //   }
  // });

  function provideCodeLenses(document, token) {
    const matches = findRegexes(document);

    const codeLenses = [];
    for (const match of matches) {
      codeLenses.push(
        new vscode.CodeLens(match.range, {
          title: "TEPI - run line ",
          command: "tepi.run",
          arguments: [match],
        }),
        new vscode.CodeLens(match.range, {
          title: "run line --display full ",
          command: "tepi.run-display-full",
          arguments: [match],
        }),
        new vscode.CodeLens(match.range, {
          title: " run file ",
          command: "tepi.run-all",
          arguments: [match],
        }),
        new vscode.CodeLens(match.range, {
          title: " help ",
          command: "tepi.help"
        }),
      );
    }
    return codeLenses;
  }
  function findRegexes(document) {
    const HTTP_VERB_REGEX =
      /GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE/g;
    // const URL_REGEX = /https?:\/\/[^\s]+/g;
    // const allRegex = new RegExp(
    //   `(${HTTP_VERB_REGEX.source})\\s+(${URL_REGEX.source})`,
    //   "g",
    // );
    const allRegex = new RegExp(`(${HTTP_VERB_REGEX.source})`, "g");
    const text = document.getText();
    const matches = [];
    let match;
    while (match = allRegex.exec(text)) {
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match[0].length),
      );
      const documentLine = document.lineAt(range.start.line);
      const documentFile = document.fileName;
      matches.push({ documentLine, documentFile, range });
    }
    return matches;
  }
}

module.exports = {
  activate,
};
