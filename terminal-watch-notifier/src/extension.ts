import * as vscode from "vscode";

// Safe CommonJS require for node-notifier
function getNotifier() {
  try {
    const nn = require("node-notifier");
    return nn.default || nn;
  } catch {
    return undefined;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "terminal-watch-notifier.notify",
    (title: string, message: string) => {
      const notifier = getNotifier();

      // This extension runs on the local UI host, so node-notifier can raise
      // native Windows/macOS/Linux desktop notifications even when Terminal
      // Watch itself runs inside a container or remote workspace.
      if (notifier) {
        notifier.notify({
          title: title || "Terminal Watch",
          message: message || "Event triggered",
          wait: false,
        });
      } else {
        vscode.window.showInformationMessage(`${title}: ${message}`);
      }
    },
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
