# Terminal Watch

<!-- Stay productive while Terminal Watch alerts you when your commands finish. -->

Terminal Watch is a VS Code extension that monitors terminal output and alerts you when your configured regex patterns appear. Whether you're waiting on a CLI AI agent (Claude Code, Codex, Freebuff, and more), a long build, tests, deployments, or any other long-running terminal process, Terminal Watch lets you step away and get notified when it's done.

Terminal Watch is split into two extensions so that notifications reach your desktop even when the monitored terminal runs somewhere else:

| Extension | Where it runs | What it does |
| --- | --- | --- |
| **Terminal Watch** | Workspace (container / remote host / local) | Spawns and monitors a watched terminal, matches regex triggers, and decides when to notify |
| **Terminal Watch Notifier** | UI host (your local machine) | Receives notifications from Terminal Watch and raises native OS desktop notifications |

Install the **Terminal Watch Pack** to get both extensions with a single click.

_Created by **Connor K**._

---

## 🚀 Features

- 🔔 **Desktop & In-Editor Notifications** - Get notified via native OS desktop alerts (via Terminal Watch Notifier) or VS Code popup notifications.
- 💬 **Configurable Triggers** - Support for multiple, fully custom regular expression triggers.
- ⚡ **Lightweight Terminal Monitoring** - Low overhead background terminal stdout stream filtering.
- 🎯 **Flexible Notification Modes** - Choose Desktop, VS Code, or Both.
- 🖥️ **Container & Remote Friendly** - Terminal Watch runs inside your devcontainer or remote host while desktop notifications still appear on your local machine.
- 🏃 **Workflow Agnostic** - Works seamlessly with AI agents, test runners, build tools, and custom scripts.
- 🤖 **CLI AI Agent Ready** - Launch Claude Code, Codex, Freebuff, or any agentic CLI in a watched terminal and get pinged the moment it finishes your prompt.

---

## 🛠️ How to Use

1. Install the **Terminal Watch Pack** (or Terminal Watch + Terminal Watch Notifier individually).
2. Click the **New Watched Terminal** button located in the bottom-right corner of the status bar (or press `Ctrl+Shift+P` / `Cmd+Shift+P` and search for `Terminal Watch: Create Watched Terminal`).
3. Select your preferred terminal type (the default profile is recommended).
4. Run your command, script, or AI agent as usual in the newly opened terminal.
5. Step away—Terminal Watch will send you a notification as soon as your regex trigger is matched!

---

## 💡 Example Use Cases

### 🤖 CLI AI Agents (Claude Code, Codex, Freebuff & more)

Terminal Watch is built for agentic CLI workflows. Start Claude Code, Codex, Freebuff, or any other coding agent in a **Watched Terminal**, step away, and Terminal Watch notifies you — on your desktop or in-editor — the moment its output signals it's done with your prompt.

| Workflow | Trigger pattern |
| --- | --- |
| Claude Code wrapping up | `End Session` |
| Agent printing a completion summary | `completed\|finished\|done\|success` |
| Test runner finishing | `\d+ tests passed` |
| Build / compile finishing | `Build successful` |
| Deployment finishing | `Deployment complete` |

> 💡 Most agents print a final summary when a prompt completes — set a trigger that matches that line (or the agent's exit banner) and you'll be notified the moment it appears.

### Builds & Compilations

Get notified when a build completes:

- Pattern: `Build successful`

### Test Suites

Get notified when test runners finish:

- Pattern: `\d+ tests passed`

### Deployments

Get notified when a deployment command wraps up:

- Pattern: `Deployment complete`

---

## ⚙️ Extension Settings

Configure Terminal Watch by searching for `Terminal Watch` in VS Code Settings (`Ctrl+,`) or adding the following to your `settings.json`:

```json
{
  "terminalWatch.triggers": [
    "End Session",
    "Build successful",
    "\\d+ tests passed"
  ],
  "terminalWatch.notificationMode": "Both",
  "terminalWatch.cooldownSeconds": 5
}
```

### Available Options

- `terminalWatch.triggers`: `array` — List of regular expressions to monitor for in terminal output.
  _Default:_ `["End Session", "Build successful", "\\d+ tests passed"]`
- `terminalWatch.notificationMode`: `string` — Controls where notifications are sent.
  _Options:_ `"Desktop"`, `"VS Code"`, `"Both"`
  _Default:_ `"Both"`
- `terminalWatch.cooldownSeconds`: `number` — Minimum seconds between notifications.
  _Default:_ `5`
- `terminalWatch.shellPath`: `string` — Custom path to the shell executable (leave blank to auto-detect OS default).

---

## 🔍 How It Works

Terminal Watch listens to terminal output, strips away terminal formatting ANSI codes, and runs the clean text against your configured regular expressions. When a match is detected, it immediately dispatches your selected notification type:

- **VS Code mode** - Shows an in-editor popup directly from Terminal Watch.
- **Desktop mode** - Executes the `terminal-watch-notifier.notify` command, handled by the Terminal Watch Notifier extension on your local UI host, which raises a native OS notification via `node-notifier`.

---

## 📋 Requirements

- Requires VS Code version `1.125.0` or higher.
- **Terminal Watch Notifier** extension (installed automatically when Terminal Watch is installed, or together via the Terminal Watch Pack). In Dev Containers and remote workspaces, the notifier runs on your local machine; Terminal Watch still activates inside the container because the notifier declares `"api": "none"`, which allows the extension dependency to be satisfied across extension hosts.
- A terminal workflow that produces detectable stdout text.

---

## ⚠️ Known Issues & Compatibility

- 📦 **Split Architecture**: Desktop notifications require the Terminal Watch Notifier extension (which runs on your local machine). If it is unavailable, Terminal Watch falls back to an in-editor notification so matches are never silently dropped.
- 🐳 **Dev Containers & Remote**: Terminal Watch activates in the container and delegates notifications to the notifier on your local UI host. Make sure the notifier is installed on your local machine (the Pack does this automatically).
- ⚡ **Formatting Stripping**: Very complex terminal control sequences or ANSI art may occasionally obscure pattern matching.

---

## 🗺️ Roadmap

- 👆 Click notification to focus active terminal
- 🎛️ Per-trigger notification preferences
- 🤖 Presets for popular AI coding agents (Claude Code, Codex, and others)
- 📚 Expanded documentation and workflow examples

---

## 📜 Release Notes

### 0.0.3

- Fixed activation in Dev Containers and remote workspaces (cross-host extension dependency via `"api": "none"`).
- Better marketplace discoverability for CLI AI agents (Claude Code, Codex, Freebuff, and more).
- Replaced placeholder default triggers with useful defaults.

### 0.0.2

- Split desktop notification handling into the new **Terminal Watch Notifier** UI extension so notifications work from containers and remote workspaces.
- Terminal Watch now runs entirely in the workspace and delegates desktop notifications via a cross-extension command.

### 1.0.0

- Initial release of Terminal Watch.
- Core regex terminal stdout monitoring.
- Windows desktop and VS Code in-editor notifications.

---

## 🤝 Contributing & Support

Suggestions, bug reports, and feature requests are welcome!

> _"You shouldn't have to watch a terminal window just to know when your work is finished."_ — Connor K.

---

## 📄 License

License: MIT
