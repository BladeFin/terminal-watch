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

// Handler registered on BOTH UI (Host) and Workspace (Container)
export function registerNotificationHandler(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "terminal-watch.showHostNotification",
    (title: string, message: string) => {
      const notifier = getNotifier();

      // If running on local host, node-notifier hits native Windows/macOS toasts
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

// Called by checkOutput in extension.ts when a regex match occurs
export function desktopNotify(title: string, message: string) {
  // Calls the command registered by the UI Companion extension
  vscode.commands.executeCommand("terminal-watch-host.notify", title, message);
}
