import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Safe CommonJS require for node-notifier
function getNotifier() {
  try {
    const nn = require("node-notifier");
    return nn.default || nn;
  } catch {
    return undefined;
  }
}

// node-notifier detects WSL and uses the Windows toaster (snoretoast) there,
// even though process.platform reports "linux". Mirror its detection so the
// pre-flight check covers WSL too: WSL sets WSL_DISTRO_NAME in the env.
function isWsl(): boolean {
  return process.platform === "linux" && !!process.env.WSL_DISTRO_NAME;
}

/**
 * node-notifier spawns platform binaries that it locates relative to its own
 * module directory (`path.resolve(__dirname, "../vendor/...")`). After esbuild
 * bundles everything into `out/extension.js`, `__dirname` points at this
 * extension's `out/` folder, so the binaries must live at `<ext>/vendor` (see
 * `scripts/copy-vendor.mjs`).
 *
 * Returns the path we expect for the current platform, or `undefined` when the
 * platform has no bundled binary (native Linux/BSD use system `notify-send`).
 */
function expectedBinaryPath(): string | undefined {
  if (process.platform === "win32" || isWsl()) {
    const arch = process.arch === "x64" ? "64" : "86";
    return path.join(
      __dirname,
      "..",
      "vendor",
      "snoreToast",
      `snoretoast-x${arch}.exe`,
    );
  }
  if (process.platform === "darwin") {
    return path.join(
      __dirname,
      "..",
      "vendor",
      "mac.noindex",
      "terminal-notifier.app",
      "Contents",
      "MacOS",
      "terminal-notifier",
    );
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "terminal-watch-notifier.notify",
    (title: string, message: string) => {
      const notifier = getNotifier();

      // This extension runs on the local UI host, so node-notifier can raise
      // native Windows/macOS/Linux desktop notifications even when Terminal
      // Watch itself runs inside a container or remote workspace.
      if (!notifier) {
        vscode.window.showInformationMessage(`${title}: ${message}`);
        return;
      }

      // Pre-flight check: node-notifier's Windows toaster swallows spawn
      // errors internally (reports them as success), so a missing binary
      // would otherwise fail completely silently.
      const binary = expectedBinaryPath();
      if (binary && !fs.existsSync(binary)) {
        vscode.window.showErrorMessage(
          `Terminal Watch: desktop notifications unavailable — missing binary: ${binary}. Reinstall the extension to restore them.`,
        );
        // Fall back to an in-editor notification so the match is never dropped.
        vscode.window.showInformationMessage(`${title}: ${message}`);
        return;
      }

      notifier.notify(
        {
          title: title || "Terminal Watch",
          message: message || "Event triggered",
          wait: false,
        },
        (error: Error | null) => {
          if (error) {
            console.error("[terminal-watch-notifier]", error);
            vscode.window.showWarningMessage(
              `Terminal Watch: desktop notification failed (${error.message})`,
            );
            // Fall back to an in-editor notification so the match is never dropped.
            vscode.window.showInformationMessage(`${title}: ${message}`);
          }
        },
      );
    },
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
