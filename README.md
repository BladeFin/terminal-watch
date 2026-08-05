# Terminal Watch

**Stay productive while Terminal Watch alerts you when your commands finish.**

Terminal Watch is a VS Code extension that monitors terminal output and sends notifications when your configured regex patterns appear.

Whether you're waiting on an AI coding agent, a long build, tests, deployments, or any other long-running terminal process, Terminal Watch lets you step away and get notified when it's done.

Created by **Connor K**.

---

## Features

- 🔔 Desktop notifications when terminal output matches a pattern
- 💬 VS Code notifications for in-editor alerts
- 🔎 Support for multiple regular expression triggers
- ⚡ Lightweight terminal monitoring
- 🎯 Configurable notification behavior
- 🖥️ Works with any terminal-based workflow

---

## Example Use Cases

### AI Coding Agents

Run an agent and get notified when it finishes:

```text
End Session
```

````

or:

```regex
completed|finished|done
```

---

### Builds

Watch for:

```regex
Build successful
```

---

### Tests

Watch for:

```regex
\d+ tests passed
```

---

### Deployments

Watch for:

```regex
Deployment complete
```

---

## Configuration

Open VS Code settings and search for:

```
Terminal Watch
```

or edit your `settings.json`:

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

---

## Settings

### `terminalWatch.targetRegexes`

Array of regular expressions to monitor for.

Example:

```json
["FREEBUFF>", "Tests: \\d+ passed", "Deployment complete"]
```

---

### `terminalWatch.notificationMode`

Controls where notifications appear.

Options:

- `Desktop`
- `VS Code`
- `Both`

Default:

```json
"Both"
```

---

## How It Works

Terminal Watch monitors terminal output, removes terminal formatting codes, and checks the output against your configured regex patterns.

When a match is found, Terminal Watch sends your configured notification.

---

## Requirements

- VS Code 1.85+
- A terminal workflow that produces detectable output

---

## Roadmap

Planned improvements:

- 🎨 Extension logo and branding
- 🍎 macOS desktop notification support
- 🐧 Linux desktop notification support
- 🎛️ Per-trigger notification preferences
- 🤖 Presets for popular AI coding agents (Claude Code, Codex, and others)
- 📚 Expanded documentation and examples
- ✨ Additional quality-of-life improvements

---

## Contributing

Suggestions, bug reports, and feature requests are welcome.

---

## About

Terminal Watch was created by **Connor K** to solve a simple problem:

> You shouldn't have to watch a terminal window just to know when your work is finished.

---

## License

MIT License
````
