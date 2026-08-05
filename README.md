# Terminal Watch

<!-- Stay productive while Terminal Watch alerts you when your commands finish. -->

Terminal Watch is a VS Code extension that monitors terminal output and sends notifications when your configured regex patterns appear. Whether you're waiting on an AI coding agent, a long build, tests, deployments, or any other long-running terminal process, Terminal Watch lets you step away and get notified when it's done.

_Created by **Connor K**._

---

## 🚀 Features

- 🔔 **Desktop & In-Editor Notifications** - Get notified via Windows desktop alerts or VS Code popup notifications.
- 💬 **Configurable Triggers** - Support for multiple, fully custom regular expression triggers.
- ⚡ **Lightweight Terminal Monitoring** - Low overhead background terminal stdout stream filtering.
- 🎯 **Flexible Notification Modes** - Choose Desktop, VS Code, or Both.
- 🖥️ **Workflow Agnostic** - Works seamlessly with AI agents, test runners, build tools, and custom scripts.

---

## 🛠️ How to Use

1. Click the **New Watched Terminal** button located in the bottom-right corner of the status bar (or press `Ctrl+Shift+P` / `Cmd+Shift+P` and search for `Terminal Watch: Create Watched Terminal`).
2. Select your preferred terminal type (the default profile is recommended).
3. Run your command, script, or AI agent as usual in the newly opened terminal.
4. Step away—Terminal Watch will send you a notification as soon as your regex trigger is matched!

---

## 💡 Example Use Cases

### AI Coding Agents

Get notified when an agent finishes its task:

- Pattern: `End Session`
- Pattern: `completed|finished|done`

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
  "terminalWatch.targetRegexes": [
    "End Session",
    "Build complete",
    "\\d+ tests passed"
  ],
  "terminalWatch.notificationMode": "Both"
}
```

### Available Options

- `terminalWatch.targetRegexes`: `array` — List of regular expressions to monitor for in terminal output.  
  _Default:_ `["End Session", "Build complete", "\\d+ tests passed"]`
- `terminalWatch.notificationMode`: `string` — Controls where notifications are sent.  
  _Options:_ `"Desktop"`, `"VS Code"`, `"Both"`  
  _Default:_ `"Both"`

---

## 🔍 How It Works

Terminal Watch listens to terminal output, strips away terminal formatting ANSI codes, and runs the clean text against your configured regular expressions. When a match is detected, it immediately dispatches your selected notification type.

---

## 📋 Requirements

- Requires VS Code version `1.85.0` or higher.
- A terminal workflow that produces detectable stdout text.

---

## ⚠️ Known Issues & Compatibility

- 🖥️ **OS Compatibility Notice**: Desktop notifications currently support **Windows only** (tested on **Windows 11**). Support for macOS and Linux is on the roadmap.
- ⚡ **Formatting Stripping**: Very complex terminal control sequences or ANSI art may occasionally obscure pattern matching.

---

## 🗺️ Roadmap

- 🍎 macOS desktop notification support
- 🐧 Linux desktop notification support
- 🎨 Extension logo and official branding
- 👆 Click notification to focus active terminal
- 🎛️ Per-trigger notification preferences
- 🤖 Presets for popular AI coding agents (Claude Code, Codex, and others)
- 📚 Expanded documentation and workflow examples

---

## 📜 Release Notes

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
