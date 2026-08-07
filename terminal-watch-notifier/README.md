# Terminal Watch Notifier

<!-- Raises native OS desktop notifications for the Terminal Watch extension. -->

Terminal Watch Notifier is the desktop notification companion to [Terminal Watch](https://marketplace.visualstudio.com/items?itemName=BladeFin.terminal-watch). When Terminal Watch detects one of your regex triggers in a monitored terminal, it calls this extension, which raises a native OS notification on your local machine.

_Created by **Connor K**._

---

## 🚀 Features

- 🔔 **Native OS Desktop Notifications** - Uses `node-notifier` to raise Windows, macOS, and Linux desktop notifications.
- 🖥️ **UI-Host Extension** - Runs on your local machine, so notifications appear on your desktop even when Terminal Watch itself runs inside a container, over SSH, or in WSL.
- 🤫 **Hands-Free** - No configuration, no commands to run, no UI to manage.

---

## 🛠️ How to Use

1. Install the **Terminal Watch Pack** (or Terminal Watch + this extension individually).
2. Use Terminal Watch as usual — this extension does the rest automatically.

When a trigger matches, Terminal Watch executes the `terminal-watch-notifier.notify` command that this extension registers, and a desktop notification appears.

---

## 📋 Requirements

- Requires VS Code version `1.125.0` or higher.
- **Terminal Watch** extension (installed automatically with this extension's pack, or on its own).

This extension declares `"api": "none"`, which is what allows Terminal Watch to depend on it from inside a Dev Container or remote workspace while this extension keeps running on your local UI host.

---

## ⚙️ Extension Settings

None. This extension is fully automatic.

---

## 🔍 How It Works

- **Terminal Watch** (workspace extension) runs where your terminals run — inside a devcontainer, on a remote host, or locally — and detects regex matches in terminal output.
- **Terminal Watch Notifier** (UI extension) runs on your local machine's VS Code UI host. Terminal Watch invokes its `terminal-watch-notifier.notify` command across the extension boundary, and node-notifier raises the native notification.

This split guarantees desktop notifications are raised on the machine you are actually sitting at, even when the watched terminal lives in a container.

---

## ⚠️ Known Issues & Compatibility

- Desktop notifications depend on your OS's notification service being available and enabled.
- If node-notifier cannot be loaded in a given environment, this extension falls back to an in-editor VS Code notification.

---

## 📜 Release Notes

### 0.0.1

- Initial release of Terminal Watch Notifier.
- Native desktop notifications via node-notifier.
- Split from Terminal Watch so notifications work from containers and remote workspaces.

---

## 📄 License

License: MIT
