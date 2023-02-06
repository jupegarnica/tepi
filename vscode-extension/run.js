const vscode = require("vscode");

// create a activation function for the extension
// this function is called when the extension is activated
function activate(context) {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("http", { provideCodeLenses }),
  );
  context.subscriptions.push(
    // register a command for the extension
    vscode.commands.registerCommand("extension.vscode-tepi-run", (match) => {
      const terminal = vscode.window.createTerminal("tepi");
      const path = match.documentFile;
      const fileLine = match.documentLine.lineNumber + 1;
      terminal.sendText(`tepi ${path}:${fileLine} --display full`);
      terminal.show();
    }),
  );
  context.subscriptions.push(
    // register a command for the extension
    vscode.commands.registerCommand(
      "extension.vscode-tepi-run-all",
      (match) => {
        console.log(match);
        const terminal = vscode.window.createTerminal("tepi");
        const path = match.documentFile;
        terminal.sendText(`tepi ${path}`);
        terminal.show();
      },
    ),
  );

  function provideCodeLenses(document, token) {
    const matches = findRegexes(document);

    const codeLenses = [];
    for (const match of matches) {
      codeLenses.push(
        new vscode.CodeLens(match.range, {
          title: "TEPI - run line",
          command: "extension.vscode-tepi-run",
          arguments: [match],
        }),
        new vscode.CodeLens(match.range, {
          title: "TEPI - run all",
          command: "extension.vscode-tepi-run-all",
          arguments: [match],
        }),
      );
    }
    return codeLenses;
  }
  function findRegexes(document) {
    const HTTP_VERB_REGEX =
      /GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE/g;
    const URL_REGEX = /https?:\/\/[^\s]+/g;
    const allRegex = new RegExp(
      `(${HTTP_VERB_REGEX.source})\\s+(${URL_REGEX.source})`,
      "g",
    );
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
