# Terminal Watch

Watches your terminal so you don't have to.

[![Version](https://vsmarketplacebadges.dev/version-short/BladeFin.terminal-watch.svg)](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch)
[![Installs](https://vsmarketplacebadges.dev/installs/BladeFin.terminal-watch.svg)](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](terminal-watch/LICENSE)

Terminal Watch pings you the moment your terminal output matches a regex — so you can kick off a long build, a test suite, a deployment, or a CLI AI agent and walk away. No more babysitting the terminal.

**🤖 AI agent finished** — set a trigger for the agent's "done" banner and step away:

![AI agent demo](terminal-watch/images/demo-ai.gif)

**🧪 Test suite finished** — get pinged the moment `\d+ tests passed` appears:

![Test suite demo](terminal-watch/images/demo-tests.gif)

## What it does

- **Regex triggers** — watch for any pattern in terminal output (ANSI codes stripped), with sensible defaults for builds, tests, deployments, and AI agents
- **Desktop + in-editor notifications** — a native OS notification, a VS Code toast, or both
- **Container & remote friendly** — monitors terminals in devcontainers, over SSH, or in WSL, and still pings you on your local desktop
- **Listening toggle & cooldown** — nothing is scanned while it's off; a cooldown silences notification storms
- **Zero native dependencies** — reuses the `node-pty` module already bundled with VS Code

## Quick start

1. **Install the [Terminal Watch Pack](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch-pack)** — one click installs Terminal Watch plus its notification companion.
2. Click **Terminal Watch** in the status bar → turn **Listening: ON** → **New Watched Terminal**.
3. Run your command, walk away, get notified when it's done.

## Use cases

| You're running…                               | Example trigger       | You get pinged when…          |
| --------------------------------------------- | --------------------- | ----------------------------- |
| A CLI AI agent (Claude Code, Codex, Freebuff) | `End session`         | the agent finishes its prompt |
| A test suite                                  | `\d+ tests passed`    | the suite passes              |
| A build / compile                             | `Build successful`    | it finishes compiling         |
| A deployment                                  | `Deployment complete` | it ships                      |

Triggers are plain regexes — add your own under `terminalWatch.triggers` in Settings.

## How it works

One project, two extensions — because the terminal and the notification live in different places:

- **Terminal Watch** is a _workspace_ extension. It runs wherever your terminal runs — inside a devcontainer, on a remote host, or locally — spawns a watched terminal via VS Code's bundled `node-pty`, and matches triggers in the output.
- **Terminal Watch Notifier** is a _UI_ extension. It always runs on your local machine and raises the native OS notification when Terminal Watch calls it.

That split is what makes container and remote workflows work: the terminal is watched in the container, but the "your tests passed" popup still lands on your desktop.

**Stack:** TypeScript · VS Code extension API (workspace + UI hosts) · `node-pty` (bundled with VS Code) · `node-notifier` · regex matching, unit-tested with Mocha.

## Repository layout

| Folder                     | What it is                                            |
| -------------------------- | ----------------------------------------------------- |
| `terminal-watch/`          | The main extension — watched terminals + regex engine |
| `terminal-watch-notifier/` | The desktop-notification companion                    |
| `terminal-watch-pack/`     | One-click extension pack that installs both           |

Each folder is a standard VS Code extension scaffold: `npm install && npm run compile && npm run lint`.

## Compatibility

- Requires VS Code `^1.125.0`
- Tested primarily on **Windows**; macOS and Linux supported via VS Code's bundled `node-pty`
- 🐳 In devcontainers, add `BladeFin.terminal-watch` to `devcontainer.json` — the notifier stays on your local machine automatically

## License

MIT
