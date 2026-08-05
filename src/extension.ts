import * as vscode from "vscode";
import { desktopNotify } from "./notifications";

// Regex to strip ANSI color/control codes so string matching is reliable
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("terminalWatch");

  let notificationMode = config.get<string>("notificationMode", "Both");
  let triggers = compileRegexes(config.get<string[]>("triggers", []));
  let cooldownSeconds = config.get<number>("cooldownSeconds", 5);
  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("terminalWatch")) {
      const config = vscode.workspace.getConfiguration("terminalWatch");

      triggers = compileRegexes(config.get<string[]>("triggers", []));
      notificationMode = config.get<string>("notificationMode", "Both");
      cooldownSeconds = config.get<number>("cooldownSeconds", 5);
    }
  });

  context.subscriptions.push(configListener);

  const commandDisposable = vscode.commands.registerCommand(
    "terminal-watch.createWatchedTerminal",
    () => {
      // 1. Create a native interactive terminal
      const terminal = vscode.window.createTerminal({
        name: "Watched Terminal",
      });

      // 2. Reveal panel drawer and bring focus to terminal (mimics Ctrl+J / Ctrl+`)
      terminal.show(false);
      vscode.commands.executeCommand("workbench.action.terminal.focus");

      let lineBuffer = "";
      let lastTriggerTime = 0;

      // 3. Intercept output directly from VS Code's terminal stream
      const dataListener = (<any>vscode.window).onDidWriteTerminalData(
        (e: any) => {
          // Only inspect output originating from this specific terminal instance
          if (e.terminal === terminal) {
            // Strip ANSI formatting codes
            const cleanData = e.data.replace(ANSI_REGEX, "");

            // Maintain a rolling buffer of the last 1000 characters
            lineBuffer = (lineBuffer + cleanData).slice(-1000);

            const matchedRegex = triggers.find((regex) => {
              regex.lastIndex = 0;
              return regex.test(lineBuffer);
            });

            if (matchedRegex) {
              const now = Date.now();
              // Debounce notifications by 1 second
              if (now - lastTriggerTime > cooldownSeconds * 1000) {
                lastTriggerTime = now;
                lineBuffer = ""; // Reset buffer after match
                if (
                  notificationMode === "VS Code" ||
                  notificationMode === "Both"
                ) {
                  vscode.window.showInformationMessage(
                    `Terminal Watch: Detected target string "${matchedRegex.source}"`,
                  );
                }
                if (
                  notificationMode === "Desktop" ||
                  notificationMode === "Both"
                ) {
                  desktopNotify(
                    "Terminal Watch",
                    `Detected String: "${matchedRegex.source}`,
                  );
                }
              }
            }
          }
        },
      );

      // 4. Clean up event listener when terminal is destroyed
      const closeListener = vscode.window.onDidCloseTerminal(
        (closedTerminal) => {
          if (closedTerminal === terminal) {
            dataListener.dispose();
            closeListener.dispose();
          }
        },
      );

      context.subscriptions.push(dataListener, closeListener);
    },
  );

  // Status Bar Button Setup
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "terminal-watch.createWatchedTerminal";
  statusBarItem.text = "$(terminal) New Watched Terminal";
  statusBarItem.tooltip = "Click to launch watched terminal";
  statusBarItem.show();

  context.subscriptions.push(commandDisposable, statusBarItem);
}

export function deactivate() {}

function compileRegexes(patterns: string[]): RegExp[] {
  return patterns.flatMap((pattern) => {
    try {
      return [new RegExp(pattern)];
    } catch {
      vscode.window.showWarningMessage(`Invalid regex: ${pattern}`);
      return [];
    }
  });
}
