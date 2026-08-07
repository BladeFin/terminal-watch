import * as vscode from "vscode";
import * as fs from "fs";
import { desktopNotify } from "./notifications";

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

declare const __webpack_require__: unknown;
declare const __non_webpack_require__: NodeRequire;

const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function supportsShellIntegration(shellPath: string): boolean {
  const base = shellPath.split(/[\\/]/).pop()?.toLowerCase() ?? "";
  return [
    "pwsh.exe",
    "powershell.exe",
    "bash",
    "zsh",
    "fish",
    "bash.exe",
  ].includes(base);
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

  // Candidates across Windows, Linux, macOS, and Containers
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
    } else {
      if (cand.path.startsWith("/") && fs.existsSync(cand.path)) {
        choices.push({
          label: cand.label,
          description: cand.path,
          shellPath: cand.path,
        });
      }
    }
  }

  return choices;
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("terminalWatch");

  let notificationMode = config.get<string>("notificationMode", "Both");
  let triggers = compileRegexes(config.get<string[]>("triggers", []));
  let cooldownSeconds = config.get<number>("cooldownSeconds", 5);
  let shellPath = resolveConfiguredShell(config);

  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("terminalWatch")) {
      const config = vscode.workspace.getConfiguration("terminalWatch");

      triggers = compileRegexes(config.get<string[]>("triggers", []));
      notificationMode = config.get<string>("notificationMode", "Both");
      cooldownSeconds = config.get<number>("cooldownSeconds", 5);
      shellPath = resolveConfiguredShell(config);
    }
  });

  context.subscriptions.push(configListener);

  const stateByTerminal = new WeakMap<
    vscode.Terminal,
    { buffer: string; lastTriggerTime: number }
  >();

  function checkOutput(terminal: vscode.Terminal, data: string) {
    const state = stateByTerminal.get(terminal) ?? {
      buffer: "",
      lastTriggerTime: 0,
    };
    stateByTerminal.set(terminal, state);

    const cleanData = data.replace(ANSI_REGEX, "");
    state.buffer = (state.buffer + cleanData).slice(-1000);

    const matchedRegex = triggers.find((regex) => {
      regex.lastIndex = 0;
      return regex.test(state.buffer);
    });

    if (!matchedRegex) {
      return;
    }

    const now = Date.now();
    if (now - state.lastTriggerTime <= cooldownSeconds * 1000) {
      return;
    }

    state.lastTriggerTime = now;
    state.buffer = "";

    if (notificationMode === "VS Code" || notificationMode === "Both") {
      vscode.window.showInformationMessage(
        `Terminal Watch: Detected "${matchedRegex.source}"`,
      );
    }
    if (notificationMode === "Desktop" || notificationMode === "Both") {
      desktopNotify("Terminal Watch", `Detected "${matchedRegex.source}"`);
    }
  }

  const watchedTerminals = new Set<vscode.Terminal>();

  function createShellIntegrationWatchedTerminal(path: string) {
    const terminal = vscode.window.createTerminal({
      name: "Watched Terminal",
      shellPath: path,
    });
    watchedTerminals.add(terminal);
    stateByTerminal.set(terminal, { buffer: "", lastTriggerTime: 0 });
    terminal.show(false);
    vscode.commands.executeCommand("workbench.action.terminal.focus");
  }

  const startListener = vscode.window.onDidStartTerminalShellExecution(
    async (event) => {
      const { terminal, execution } = event;
      if (!watchedTerminals.has(terminal)) {
        return;
      }
      const stream = execution.read();
      for await (const data of stream) {
        checkOutput(terminal, data);
      }
    },
  );
  context.subscriptions.push(startListener);

  function loadBundledPty(): PtyModule | undefined {
    const requireFunc =
      typeof __webpack_require__ === "function"
        ? __non_webpack_require__
        : require;

    const path = require("path");

    const searchPaths = [
      path.join(vscode.env.appRoot, "node_modules.asar", "node-pty"),
      path.join(vscode.env.appRoot, "node_modules", "node-pty"),
    ];

    for (const ptyPath of searchPaths) {
      try {
        const bundled = requireFunc(ptyPath);
        return bundled;
      } catch (err) {
        // Silently fail and continue to next path
      }
    }

    return undefined;
  }

  function createPtyWatchedTerminal(path: string, pty: PtyModule) {
    if (
      process.platform !== "win32" &&
      path.startsWith("/") &&
      !fs.existsSync(path)
    ) {
      const msg = `[terminal-watch] Cannot launch: Shell executable "${path}" does not exist on this system.`;
      vscode.window.showErrorMessage(msg);
      return;
    }

    let initialPty: IPty;
    try {
      initialPty = pty.spawn(path, [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        env: process.env as { [key: string]: string },
      });
    } catch (err) {
      const msg = `[terminal-watch] Failed to spawn watched terminal for "${path}": ${err}`;
      vscode.window.showErrorMessage(msg);
      return;
    }

    const writeEmitter = new vscode.EventEmitter<string>();
    let shellProcess: IPty | undefined = initialPty;
    let terminalRef: vscode.Terminal;
    let isExited = false;

    const state = { buffer: "", lastTriggerTime: 0 };

    const pseudoterminal: vscode.Pseudoterminal = {
      // Add the missing onDidWrite property here
      onDidWrite: writeEmitter.event,
      open: (initialDimensions) => {
        if (initialDimensions && shellProcess) {
          try {
            shellProcess.resize(
              initialDimensions.columns,
              initialDimensions.rows,
            );
          } catch {
            // Ignore initial resize error if process exits fast
          }
        }

        writeEmitter.fire(
          `\x1b[90m[terminal-watch] Active monitoring enabled on "${path}" (pid ${shellProcess.pid})\x1b[0m\r\n`,
        );

        shellProcess.onData((data) => {
          writeEmitter.fire(data);
          checkOutput(terminalRef, data);
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
          shellProcess?.kill();
        }
      },
      handleInput: (data) => {
        if (!isExited) {
          shellProcess?.write(data);
        }
      },
      setDimensions: (dimensions) => {
        if (!isExited && shellProcess) {
          try {
            shellProcess.resize(dimensions.columns, dimensions.rows);
          } catch (err) {
            console.error("[terminal-watch] Resize failed:", err);
          }
        }
      },
    };

    terminalRef = vscode.window.createTerminal({
      name: "Watched Terminal",
      pty: pseudoterminal,
    });
    stateByTerminal.set(terminalRef, state);
    terminalRef.show(false);
    vscode.commands.executeCommand("workbench.action.terminal.focus");
  }

  function startWatchedTerminal(path: string) {
    const pty = loadBundledPty();

    if (!pty) {
      vscode.window.showErrorMessage(
        "Terminal Watch: Cannot initialize monitoring engine. VS Code's node-pty module could not be loaded.",
      );
      return;
    }

    createPtyWatchedTerminal(path, pty);
  }

  const commandDisposable = vscode.commands.registerCommand(
    "terminal-watch.createWatchedTerminal",
    async () => {
      const picked = await vscode.window.showQuickPick(
        getAvailableShells(shellPath),
        {
          placeHolder: "Choose a shell to watch",
        },
      );
      if (!picked) {
        return;
      }
      startWatchedTerminal(picked.shellPath);
    },
  );

  const closeListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
    watchedTerminals.delete(closedTerminal);
  });

  context.subscriptions.push(closeListener, commandDisposable);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "terminal-watch.createWatchedTerminal";
  statusBarItem.text = "$(terminal) New Watched Terminal";
  statusBarItem.tooltip =
    "Click to choose a shell and launch a watched terminal";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
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
