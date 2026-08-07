# Terminal Watch Pack

<!-- One-click install for Terminal Watch and Terminal Watch Notifier. -->

This extension pack installs both Terminal Watch extensions in one click:

| Extension                   | Where it runs                               | What it does                                                                         |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Terminal Watch**          | Workspace (container / remote host / local) | Spawns and monitors a watched terminal and matches regex triggers in terminal output |
| **Terminal Watch Notifier** | UI host (your local machine)                | Raises native OS desktop notifications when Terminal Watch detects a match           |

_Created by **Connor K**._

---

## Why two extensions?

Terminal Watch often runs inside a devcontainer, over SSH, or in WSL. Desktop notifications must be raised on the machine you are actually sitting at — your local host — not in the container.

- **Terminal Watch** is a _workspace_ extension, so it runs wherever your terminal runs.
- **Terminal Watch Notifier** is a _UI_ extension, so it always runs on your local machine.

Terminal Watch delegates desktop notifications to Terminal Watch Notifier across the extension boundary, so you get notified on your desktop no matter where the monitored terminal lives.

---

## 📦 Included Extensions

- [Terminal Watch](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch)
- [Terminal Watch Notifier](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch-notifier)

---

## 🛠️ How to Use

1. Install the **Terminal Watch Pack**.
2. Click **New Watched Terminal** in the bottom-right status bar (or run `Terminal Watch: Create Watched Terminal` from the Command Palette).
3. Pick a shell, run your command, and step away — you'll be notified when your regex triggers match.

---

## 📄 License

License: MIT
