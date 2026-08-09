# Terminal Watch Pack

<!-- One-click install for Terminal Watch and Terminal Watch Notifier. -->

This extension pack installs both Terminal Watch extensions in one click:

| Extension                   | Where it runs                               | What it does                                                                         |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Terminal Watch**          | Workspace (container / remote host / local) | Spawns and monitors a watched terminal and matches regex triggers in terminal output |
| **Terminal Watch Notifier** | UI host (your local machine)                | Raises native OS desktop notifications when Terminal Watch detects a match           |

_Created by **Connor K**._

## Demo

**🤖 CLI AI agent** — get a desktop ping the moment a CLI AI agent (Claude Code, Codex, Freebuff) finishes:

![AI agent demo](images/demo-ai.gif)

---

## Why two extensions?

Terminal Watch often runs inside a devcontainer, over SSH, or in WSL. Desktop notifications must be raised on the machine you are actually sitting at — your local host — not in the container.

- **Terminal Watch** is a _workspace_ extension, so it runs wherever your terminal runs.
- **Terminal Watch Notifier** is a _UI_ extension, so it always runs on your local machine.

Terminal Watch delegates desktop notifications to Terminal Watch Notifier across the extension boundary, so you get notified on your desktop no matter where the monitored terminal lives.

---

## 🐳 Dev Containers

Terminal Watch must be installed **inside** the container to monitor terminals there. Add it to your `devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "extensions": ["BladeFin.terminal-watch"]
    }
  }
}
```

The Notifier is a UI extension: it stays on your local machine and is pulled in automatically, so desktop notifications just work with no extra setup.

---

## 📦 Included Extensions

- [Terminal Watch](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch)
- [Terminal Watch Notifier](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch-notifier)

---

## 🛠️ How to Use

1. Install the **Terminal Watch Pack**.
2. Click **Terminal Watch** in the bottom-right status bar — a menu opens where you can toggle **Listening** on/off or launch a **New Watched Terminal** (or run `Terminal Watch: Open Menu` / `Terminal Watch: Create Watched Terminal` from the Command Palette).
3. Make sure **Listening** is **ON** (it starts OFF by default), pick a shell, run your command — a long build, a test suite, or a CLI AI agent like Claude Code, Codex, or Freebuff — and step away. You'll be notified when your regex triggers match.

**Prefer the keyboard?** Bind the commands in `keybindings.json` (`terminal-watch.createWatchedTerminal`, `terminal-watch.openMenu`).

---

## ⚠️ Compatibility

- Requires VS Code `^1.125.0`.
- Tested primarily on **Windows**; macOS and Linux should work but aren't thoroughly verified yet.
- Terminal Watch relies on VS Code's bundled `node-pty` module — an **unsupported internal mechanism** that can break on non-standard builds (Insiders, VSCodium, remote servers).

See the [Terminal Watch](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch) page for full details.

---

## 📄 License

License: MIT
