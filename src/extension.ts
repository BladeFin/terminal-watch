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

  // Tracks terminals the user asked us to watch, so the shell-execution
  // listener below only reacts to those (not every terminal in the window).
  const watchedTerminals = new Set<vscode.Terminal>();

  // Per-terminal buffer + cooldown state, since multiple watched terminals
  // can be running commands concurrently.
  const stateByTerminal = new WeakMap<
    vscode.Terminal,
    { buffer: string; lastTriggerTime: number }
  >();

  const commandDisposable = vscode.commands.registerCommand(
    "terminal-watch.createWatchedTerminal",
    () => {
      // 1. Create a completely normal, native integrated terminal.
      // No custom pty, no node-pty, nothing to compile.
      const terminal = vscode.window.createTerminal({
        name: "Watched Terminal",
        shellPath: "powershell.exe",
      });

      watchedTerminals.add(terminal);
      stateByTerminal.set(terminal, { buffer: "", lastTriggerTime: 0 });

      terminal.show(false);
      vscode.commands.executeCommand("workbench.action.terminal.focus");

      // Shell integration activates asynchronously after the terminal
      // spins up its shell. Nothing to do here except wait for
      // onDidStartTerminalShellExecution to fire for this terminal.
    },
  );

  // 2. Fires every time a command starts in ANY terminal with shell
  // integration active — including commands the user just types and
  // hits enter on, not just ones the extension launches itself.
  const startListener = vscode.window.onDidStartTerminalShellExecution(
    async (event) => {
      const { terminal, execution } = event;

      if (!watchedTerminals.has(terminal)) {
        return;
      }

      const state = stateByTerminal.get(terminal) ?? {
        buffer: "",
        lastTriggerTime: 0,
      };
      state.buffer = "";
      stateByTerminal.set(terminal, state);

      // 3. Read the command's output as a live stream. Each chunk arrives
      // as it's written to the terminal — including while a long-running
      // or interactive process (e.g. an in-progress build, or an
      // interactive CLI like Claude Code) is still producing output.
      const stream = execution.read();

      for await (const data of stream) {
        checkOutput(terminal, data);
      }
    },
  );

  context.subscriptions.push(startListener);

  function checkOutput(terminal: vscode.Terminal, data: string) {
    const state = stateByTerminal.get(terminal);
    if (!state) {
      return;
    }

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

  // 4. Clean up when a watched terminal is closed.
  const closeListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
    watchedTerminals.delete(closedTerminal);
  });

  context.subscriptions.push(closeListener, commandDisposable);

  // Status Bar Button Setup
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "terminal-watch.createWatchedTerminal";
  statusBarItem.text = "$(terminal) New Watched Terminal";
  statusBarItem.tooltip = "Click to launch watched terminal";
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
