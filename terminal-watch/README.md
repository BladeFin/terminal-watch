# Terminal Watch

<!-- TODO: add a demo GIF here (PNG/GIF/JPG, https URL) -->

Terminal Watch watches your terminal so you don't have to. It launches a dedicated **watched terminal**, scans the output for your regex triggers, and pings you — in-editor or with a native OS notification — the moment one appears. Made for long builds, test runs, deployments, and CLI AI agents (Claude Code, Codex, Codebuff, …) you'd rather not babysit.

_Created by **Connor K**._

## Highlights

- 🔔 **Desktop + in-editor notifications** when a command finishes
- ⚙️ **Custom regex triggers** with a cooldown to cut the noise
- 🔕 **Listening toggle** — nothing is scanned while it's off
- 🖥️ **Container & remote friendly** — notifications still land on your desktop
- 🤖 **CLI AI agent ready** — set a trigger for the agent's "done" banner and walk away

## Quickstart

1. Install the **Terminal Watch Pack** (or Terminal Watch + Terminal Watch Notifier).
2. Click **Terminal Watch** in the status bar → turn **Listening: ON**.
3. Click **New Watched Terminal**, pick a shell, run your command.
4. Get notified when it's done. That's it.

**Prefer the keyboard?** Bind the two commands in `keybindings.json`:

```json
[
  { "key": "ctrl+alt+t", "command": "terminal-watch.createWatchedTerminal" },
  { "key": "ctrl+alt+l", "command": "terminal-watch.openMenu" }
]
```

## Triggers

Output is matched against your configured regexes (ANSI codes stripped). Defaults:

| Trigger             | Use case                      |
| ------------------- | ----------------------------- |
| `End session`       | Freebuff wrapping up a prompt |
| `accept.{1,5}edits` | Agent asking to accept edits  |
| `Build successful`  | Build / compile finishing     |
| `\d+ tests passed`  | Test suite finishing          |

**Add your own:** `Ctrl+,` → search `Terminal Watch` → add a pattern to `terminalWatch.triggers`. Each entry is a regular expression — e.g. `Deployment complete` fires when a deployment finishes.

## Settings

| Setting                              | Default                                                                         | Purpose                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `terminalWatch.triggers`             | `["End session", "Build successful", "accept.{1,5}edits", "\\d+ tests passed"]` | Regexes that fire a notification                           |
| `terminalWatch.notificationMode`     | `"Both"`                                                                        | Where notifications go: `Desktop`, `VS Code`, or `Both`    |
| `terminalWatch.cooldownSeconds`      | `5`                                                                             | Minimum seconds between notifications                      |
| `terminalWatch.shellPath`            | `""`                                                                            | Custom shell executable; blank auto-detects the OS default |
| `terminalWatch.autoListeningEnabled` | `false`                                                                         | Start listening automatically when the extension activates |

## Example use cases

| Workflow                                | Trigger pattern                      |
| --------------------------------------- | ------------------------------------ |
| Freebuff wrapping up a prompt           | `End session`                        |
| Agent asking to accept edits            | `accept.{1,5}edits`                  |
| Any agent printing a completion summary | `completed\|finished\|done\|success` |
| Test suite finishing                    | `\d+ tests passed`                   |
| Build / compile finishing               | `Build successful`                   |
| Deployment finishing                    | `Deployment complete`                |

> 💡 Most AI agents print a final summary when a prompt finishes — set a trigger that matches that line (or the agent's exit banner) and you'll be notified the moment it appears.

## How it's built

Two extensions split the work so notifications always appear on the machine you're sitting at:

| Extension                   | Runs on                                     | Job                                                   |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| **Terminal Watch**          | workspace host (container / remote / local) | spawns the watched terminal, matches triggers         |
| **Terminal Watch Notifier** | UI host (your machine)                      | raises the native OS notification via `node-notifier` |

Terminal Watch reuses the PTY layer already inside VS Code: it loads the `node-pty` module bundled with the editor (`vscode.env.appRoot`) instead of shipping a native dependency, which keeps the extension tiny and platform-agnostic. That's an **unsupported internal mechanism** rather than a public API, so it can break on non-standard builds (Insiders, VSCodium, remote servers).

## Compatibility

- Requires VS Code `^1.125.0`.
- Tested primarily on **Windows**. macOS and Linux should work — `node-pty` ships with VS Code on every platform — but haven't been thoroughly verified. Please report issues!
- 🐳 **Dev containers**: Terminal Watch is a workspace extension, so it must be installed _inside_ the container — add it to your `devcontainer.json`:

  ```json
  {
    "customizations": {
      "vscode": { "extensions": ["BladeFin.terminal-watch"] }
    }
  }
  ```

  The Notifier stays on your local machine automatically — no container setup needed for it.

- ⚠️ **Triggers match everything you type**: regexes run against _all_ terminal output, including echoed input — while you're actively typing in a watched terminal, your keystrokes can match early. Prefer patterns that match finished output, or rely on the cooldown.

## Release notes

See `CHANGELOG.md` in this repo. License: MIT — see `LICENSE`.
