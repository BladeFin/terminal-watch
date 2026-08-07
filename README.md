# Terminal Watch Monorepo

Terminal Watch alerts you when your terminal output matches a regex pattern, so you can step away from long-running builds, test suites, deployments, and AI agents.

This repository contains three independently publishable VS Code extensions:

| Folder | Extension | Where it runs | Purpose |
| --- | --- | --- | --- |
| `terminal-watch/` | **Terminal Watch** | Workspace (container / remote host / local) | Spawns a watched terminal via VS Code's bundled `node-pty`, monitors output, and matches regex triggers |
| `terminal-watch-notifier/` | **Terminal Watch Notifier** | UI host (local machine) | Raises native OS desktop notifications via `node-notifier` when Terminal Watch calls its `terminal-watch-notifier.notify` command |
| `terminal-watch-pack/` | **Terminal Watch Pack** | — | An extension pack that installs both of the above in one click (`contributes.extensionPack`) |

## Why the split?

Terminal Watch is a **workspace** extension, so it runs inside your devcontainer, over SSH, or in WSL — wherever the terminal it monitors lives. Desktop notifications, however, must appear on the machine you are sitting at. Terminal Watch Notifier is a **UI** extension that always runs on your local host, and Terminal Watch delegates desktop notifications to it across the extension boundary.

## Development

Each extension folder is self-contained and mirrors the standard VS Code extension scaffold:

```bash
cd terminal-watch        # or terminal-watch-notifier
npm install
npm run compile
npm run lint
```

To run an extension in the Extension Development Host, open its folder in VS Code and press `F5`.

To test the split end-to-end, launch Terminal Watch with the notifier also loaded as a development extension:

```
--extensionDevelopmentPath=/path/to/terminal-watch
--extensionDevelopmentPath=/path/to/terminal-watch-notifier
```

## Packaging

From each extension folder:

```bash
npx @vscode/vsce package   # produces <name>-<version>.vsix
```
