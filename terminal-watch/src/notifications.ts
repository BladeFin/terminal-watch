import * as vscode from "vscode";

/**
 * Sends a desktop notification by invoking the command registered by the
 * `terminal-watch-notifier` UI extension.
 *
 * `terminal-watch-notifier` runs on the local UI host, so it can raise native
 * OS notifications even when `terminal-watch` itself runs inside a container,
 * on a remote host, or on this machine.
 *
 * If the notifier extension is unavailable, falls back to an in-editor
 * notification so a match is never silently dropped.
 */
export function desktopNotify(title: string, message: string): void {
  vscode.commands
    .executeCommand("terminal-watch-notifier.notify", title, message)
    .then(undefined, () => {
      vscode.window.showInformationMessage(`${title}: ${message}`);
    });
}
