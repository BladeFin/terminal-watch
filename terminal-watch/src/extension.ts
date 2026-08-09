import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { desktopNotify } from "./notifications";
import { compileTriggers, scanOutput, type TriggerState } from "./core";

interface IPty {
  pid: number;
  onData(callback: (data: string) => void): void;
  onExit(
    callback: (event: { exitCode: number; signal?: number }) => void,
  ): void;
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(): void;
}

interface PtyModule {
  spawn(
    file: string,
    args: string[],
    options: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: { [key: string]: string };
    },
  ): IPty;
}

function defaultShellPath(): string {
  return process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : process.env.SHELL || "/bin/bash";
}

function resolveConfiguredShell(config: vscode.WorkspaceConfiguration): string {
  return config.get<string>("shellPath", "").trim() || defaultShellPath();
}

interface ShellChoice extends vscode.QuickPickItem {
  shellPath: string;
}

function getAvailableShells(configuredPath: string): ShellChoice[] {
  const choices: ShellChoice[] = [
    {
      label: "$(gear) Configured Default",
      description: configuredPath,
      shellPath: configuredPath,
    },
  ];

  const candidates = [
    // Linux / Containers / macOS
    { label: "$(terminal-bash) Bash", path: "/bin/bash" },
    { label: "$(terminal-bash) Bash (usr)", path: "/usr/bin/bash" },
    { label: "$(terminal) Zsh", path: "/bin/zsh" },
    { label: "$(terminal) Zsh (usr)", path: "/usr/bin/zsh" },
    { label: "$(terminal) Sh", path: "/bin/sh" },
    { label: "$(terminal) Sh (usr)", path: "/usr/bin/sh" },
    { label: "$(terminal) Alpine Ash", path: "/bin/ash" },
    { label: "$(terminal) Fish", path: "/usr/bin/fish" },
    // Windows
    { label: "$(terminal-cmd) Command Prompt", path: "cmd.exe" },
    { label: "$(terminal-powershell) PowerShell", path: "powershell.exe" },
    { label: "$(terminal-bash) Git Bash", path: "bash.exe" },
    { label: "$(terminal) PowerShell Core", path: "pwsh.exe" },
  ];

  for (const cand of candidates) {
    if (cand.path === configuredPath) {
      continue;
    }

    if (process.platform === "win32") {
      choices.push({
        label: cand.label,
        description: cand.path,
        shellPath: cand.path,
      });
    } else if (cand.path.startsWith("/") && fs.existsSync(cand.path)) {
      choices.push({
        label: cand.label,
        description: cand.path,
        shellPath: cand.path,
      });
    }
  }

  return choices;
}

// VS Code bundles node-pty inside its own install; we load that copy instead
// of shipping a native dependency. Internal mechanism, not a supported API.
function loadBundledPty(): PtyModule | undefined {
  const searchPaths = [
    path.join(vscode.env.appRoot, "node_modules.asar", "node-pty"),
    path.join(vscode.env.appRoot, "node_modules", "node-pty"),
  ];

  for (const ptyPath of searchPaths) {
    try {
      return require(ptyPath) as PtyModule;
    } catch {
      // try the next candidate
    }
  }

  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("terminalWatch");

  let triggers: RegExp[] = [];
  let notificationMode = "Both";
  let cooldownSeconds = 5;
  let shellPath = defaultShellPath();
  // Initialized from autoListeningEnabled at activation, then controlled by
  // the user via the status bar menu (deliberately not reloaded on config
  // changes, which would clobber manual toggles).
  let listening = config.get<boolean>("autoListeningEnabled", false);

  function reloadConfig() {
    const config = vscode.workspace.getConfiguration("terminalWatch");

    const compiled = compileTriggers(config.get<string[]>("triggers", []));
    triggers = compiled.triggers;
    for (const pattern of compiled.invalid) {
      vscode.window.showWarningMessage(`Invalid regex: ${pattern}`);
    }

    notificationMode = config.get<string>("notificationMode", "Both");
    cooldownSeconds = config.get<number>("cooldownSeconds", 5);
    shellPath = resolveConfiguredShell(config);
  }

  reloadConfig();

  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("terminalWatch")) {
      reloadConfig();
    }
  });

  function checkOutput(state: TriggerState, data: string) {
    if (!listening) {
      return;
    }

    const match = scanOutput(state, data, triggers, cooldownSeconds * 1000);
    if (!match) {
      return;
    }

    if (notificationMode === "VS Code" || notificationMode === "Both") {
      vscode.window.showInformationMessage(
        `Terminal Watch: Detected "${match}"`,
      );
    }
    if (notificationMode === "Desktop" || notificationMode === "Both") {
      desktopNotify("Terminal Watch", `Detected "${match}"`);
    }
  }

  function spawnWatchedTerminal(shell: string, pty: PtyModule) {
    if (
      process.platform !== "win32" &&
      shell.startsWith("/") &&
      !fs.existsSync(shell)
    ) {
      vscode.window.showErrorMessage(
        `[terminal-watch] Cannot launch: Shell executable "${shell}" does not exist on this system.`,
      );
      return;
    }

    let shellProcess: IPty;
    try {
      shellProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        env: process.env as { [key: string]: string },
      });
    } catch (err) {
      vscode.window.showErrorMessage(
        `[terminal-watch] Failed to spawn watched terminal for "${shell}": ${err}`,
      );
      return;
    }

    const writeEmitter = new vscode.EventEmitter<string>();
    const state: TriggerState = { buffer: "", lastTriggerTime: 0 };
    let isExited = false;

    const pseudoterminal: vscode.Pseudoterminal = {
      onDidWrite: writeEmitter.event,

      open: (initialDimensions) => {
        if (initialDimensions) {
          try {
            shellProcess.resize(
              initialDimensions.columns,
              initialDimensions.rows,
            );
          } catch {
            // Process may have exited before the first resize
          }
        }

        writeEmitter.fire(
          `\x1b[90m[terminal-watch] ${
            listening
              ? "Active monitoring enabled"
              : "Monitoring paused (listening is OFF)"
          } on "${shell}" (pid ${shellProcess.pid})\x1b[0m\r\n`,
        );

        shellProcess.onData((data) => {
          writeEmitter.fire(data);
          checkOutput(state, data);
        });

        shellProcess.onExit(({ exitCode, signal }) => {
          isExited = true;
          writeEmitter.fire(
            `\r\n\x1b[90m[terminal-watch] process exited (code ${exitCode}${
              signal ? `, signal ${signal}` : ""
            })\x1b[0m\r\n`,
          );
        });
      },

      close: () => {
        if (!isExited) {
          isExited = true;
          shellProcess.kill();
        }
      },

      handleInput: (data) => {
        if (!isExited) {
          shellProcess.write(data);
        }
      },

      setDimensions: (dimensions) => {
        if (!isExited) {
          try {
            shellProcess.resize(dimensions.columns, dimensions.rows);
          } catch (err) {
            console.error("[terminal-watch] Resize failed:", err);
          }
        }
      },
    };

    const terminal = vscode.window.createTerminal({
      name: "Watched Terminal",
      pty: pseudoterminal,
    });
    terminal.show(false);
    vscode.commands.executeCommand("workbench.action.terminal.focus");
  }

  function startWatchedTerminal(shell: string) {
    const pty = loadBundledPty();
    if (!pty) {
      vscode.window.showErrorMessage(
        "Terminal Watch: Cannot initialize monitoring engine. VS Code's node-pty module could not be loaded.",
      );
      return;
    }
    spawnWatchedTerminal(shell, pty);
  }

  async function createWatchedTerminal() {
    const picked = await vscode.window.showQuickPick(
      getAvailableShells(shellPath),
      {
        placeHolder: "Choose a shell to watch",
      },
    );
    if (picked) {
      startWatchedTerminal(picked.shellPath);
    }
  }

  interface MenuItem extends vscode.QuickPickItem {
    action: "toggle-listening" | "create-terminal";
  }

  function updateStatusBar() {
    statusBarItem.tooltip = `Listening is ${
      listening ? "ON" : "OFF"
    } — click to toggle listening or create a watched terminal.`;
  }

  async function openMenu() {
    const toggleItem: MenuItem = listening
      ? {
          action: "toggle-listening",
          label: "$(check) Listening: ON",
          description: "Click to turn listening off",
        }
      : {
          action: "toggle-listening",
          label: "$(circle-slash) Listening: OFF",
          description: "Click to turn listening on",
        };

    const createItem: MenuItem = {
      action: "create-terminal",
      label: "$(terminal) New Watched Terminal",
      description: "Choose a shell and launch a watched terminal",
    };

    const picked = await vscode.window.showQuickPick<MenuItem>(
      [toggleItem, createItem],
      {
        placeHolder: "Terminal Watch",
      },
    );
    if (!picked) {
      return;
    }

    if (picked.action === "toggle-listening") {
      listening = !listening;
      updateStatusBar();
      await openMenu();
      return;
    }

    await createWatchedTerminal();
  }

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "terminal-watch.openMenu";
  statusBarItem.text = "$(terminal) Terminal Watch";

  updateStatusBar();
  statusBarItem.show();

  context.subscriptions.push(
    configListener,
    statusBarItem,
    vscode.commands.registerCommand(
      "terminal-watch.createWatchedTerminal",
      createWatchedTerminal,
    ),
    vscode.commands.registerCommand("terminal-watch.openMenu", openMenu),
  );
}

export function deactivate() {}
