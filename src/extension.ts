import * as vscode from "vscode";
import { desktopNotify } from "./notifications";

// Minimal structural types for the pieces of node-pty's API this file
// actually uses. Kept local instead of `import("node-pty")` so TypeScript
// doesn't need the package installed -- we only ever get an IPty instance
// at runtime via loadBundledPty(), never a static import.
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

// These only exist when the extension is bundled with webpack. TypeScript
// doesn't know about them by default, so declare them ambiently rather
// than relying on ts-ignore at each use site.
declare const __webpack_require__: unknown;
declare const __non_webpack_require__: NodeRequire;

// Regex to strip ANSI color/control codes so string matching is reliable
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// Shells VS Code's shell integration protocol actually supports. cmd.exe is
// deliberately absent -- Microsoft closed that as out of scope, cmd.exe's
// prompt mechanism can't emit the OSC 633 markers the protocol needs.
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
  if (process.platform === "win32") {
    return process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || "bash";
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("terminalWatch");

  let notificationMode = config.get<string>("notificationMode", "Both");
  let triggers = compileRegexes(config.get<string[]>("triggers", []));
  let cooldownSeconds = config.get<number>("cooldownSeconds", 5);
  let shellPath = config.get<string>("shellPath", "") || defaultShellPath();

  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("terminalWatch")) {
      const config = vscode.workspace.getConfiguration("terminalWatch");

      triggers = compileRegexes(config.get<string[]>("triggers", []));
      notificationMode = config.get<string>("notificationMode", "Both");
      cooldownSeconds = config.get<number>("cooldownSeconds", 5);
      shellPath = config.get<string>("shellPath", "") || defaultShellPath();
    }
  });

  context.subscriptions.push(configListener);

  // Per-terminal buffer + cooldown state, shared by both watching strategies.
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

    console.log("BUFFER: ", state.buffer);
    console.log("CONTAINS: ", state.buffer.includes("End Session"));

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

  // --- Path A: fallback -- shells with shell integration (pwsh, bash,
  // zsh, fish, or Windows PowerShell as the cmd.exe substitute). Used only
  // when VS Code's bundled node-pty can't be loaded. Stable API, no native
  // modules involved.
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

  // --- Path B: primary method -- pty backed by VS Code's own bundled
  // node-pty (see loadBundledPty below). Gives raw, continuous output for
  // any shell, including cmd.exe, which shell integration can't see at all.
  function loadBundledPty(): PtyModule | undefined {
    const requireFunc =
      typeof __webpack_require__ === "function"
        ? __non_webpack_require__
        : require;

    const path = require("path");

    // Array of potential paths.
    // 1. Local Desktop VS Code (.asar archive)
    // 2. Remote/Container VS Code Server (unpacked directory)
    const searchPaths = [
      path.join(vscode.env.appRoot, "node_modules.asar", "node-pty"),
      path.join(vscode.env.appRoot, "node_modules", "node-pty"),
    ];

    for (const ptyPath of searchPaths) {
      try {
        const bundled = requireFunc(ptyPath);
        console.log(
          `[terminal-watch] loaded node-pty from VS Code internals: ${ptyPath}`,
        );
        return bundled;
      } catch (err) {
        // Silently fail and continue to the next path in the array
      }
    }

    // If the loop completes without returning, none of the paths worked.
    console.log(
      "[terminal-watch] VS Code's bundled node-pty unavailable in any expected location.",
    );
    return undefined;
  }

  function createPtyWatchedTerminal(path: string, pty: PtyModule) {
    console.log("[terminal-watch] createPtyWatchedTerminal called with", path);

    const writeEmitter = new vscode.EventEmitter<string>();
    let shellProcess: IPty | undefined;
    let terminalRef: vscode.Terminal;

    const state = { buffer: "", lastTriggerTime: 0 };

    const pseudoterminal: vscode.Pseudoterminal = {
      onDidWrite: writeEmitter.event,
      open: (initialDimensions) => {
        console.log(
          "[terminal-watch] open() called, dimensions:",
          initialDimensions,
        );
        try {
          shellProcess = pty.spawn(path, [], {
            name: "xterm-color",
            cols: initialDimensions?.columns ?? 80,
            rows: initialDimensions?.rows ?? 30,
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            env: process.env as { [key: string]: string },
          });
          console.log(
            "[terminal-watch] pty.spawn returned, pid:",
            shellProcess.pid,
          );
        } catch (err) {
          console.error("[terminal-watch] pty.spawn threw:", err);
          writeEmitter.fire(`\r\nFailed to spawn ${path}: ${err}\r\n`);
          return;
        }

        writeEmitter.fire(
          `\x1b[90m[terminal-watch] spawned "${path}" (pid ${shellProcess.pid})\x1b[0m\r\n`,
        );

        shellProcess.onData((data) => {
          writeEmitter.fire(data);
          checkOutput(terminalRef, data);
        });

        shellProcess.onExit(({ exitCode, signal }) => {
          writeEmitter.fire(
            `\r\n\x1b[90m[terminal-watch] process exited (code ${exitCode}${
              signal ? `, signal ${signal}` : ""
            })\x1b[0m\r\n`,
          );
        });
      },
      close: () => {
        shellProcess?.kill();
      },
      handleInput: (data) => {
        shellProcess?.write(data);
      },
      setDimensions: (dimensions) => {
        shellProcess?.resize(dimensions.columns, dimensions.rows);
      },
    };

    terminalRef = vscode.window.createTerminal({
      name: "Watched Terminal (cmd)",
      pty: pseudoterminal,
    });
    stateByTerminal.set(terminalRef, state);
    terminalRef.show(false);
    vscode.commands.executeCommand("workbench.action.terminal.focus");
  }

  function startWatchedTerminal(path: string) {
    const pty = loadBundledPty();
    if (pty) {
      console.log(
        "[terminal-watch] starting terminal, using bundled pty for",
        path,
      );
      createPtyWatchedTerminal(path, pty);
    } else {
      const fallback = supportsShellIntegration(path) ? path : "powershell.exe";
      console.log(
        "[terminal-watch] starting terminal, bundled pty unavailable, falling back to shell-integration terminal:",
        fallback,
      );
      createShellIntegrationWatchedTerminal(fallback);
    }
  }

  interface ShellChoice extends vscode.QuickPickItem {
    shellPath: string;
  }

  function getShellChoices(): ShellChoice[] {
    return [
      {
        label: "$(gear) Configured default",
        description: shellPath,
        shellPath: shellPath,
      },
      {
        label: "$(terminal-cmd) Command Prompt",
        description: "cmd.exe",
        shellPath: "cmd.exe",
      },
      {
        label: "$(terminal-powershell) PowerShell",
        description: "powershell.exe",
        shellPath: "powershell.exe",
      },
      {
        label: "$(terminal-bash) Git Bash",
        description: "bash.exe",
        shellPath: "bash.exe",
      },
    ];
  }

  const commandDisposable = vscode.commands.registerCommand(
    "terminal-watch.createWatchedTerminal",
    async () => {
      const picked = await vscode.window.showQuickPick(getShellChoices(), {
        placeHolder: "Choose a shell to watch",
      });
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
