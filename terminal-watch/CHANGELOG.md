# Changelog

## [1.1.0] - 2026-08-11

### Added

- **Silence while focused** (`terminalWatch.silenceWhileFocused`, default `false`) — notifications only fire while this VS Code window is unfocused, so a match that lands while you're looking at the terminal stays silent. Works in containers and remote workspaces.
- **Require user input between notifications** (`terminalWatch.requireUserInput`, default `true`) — a trigger only notifies after you've typed in the watched terminal since the last notification, stopping spam from long-running commands or AI agents. Suppressed triggers are consumed, so stale output never fires later.

## [1.0.0] - 2026-08-09

First release of Terminal Watch.

- Launch a dedicated **Watched Terminal** and get notified when its output matches your regex triggers
- Native OS desktop notifications via Terminal Watch Notifier, plus in-editor popups
- Configurable triggers, notification mode, and cooldown
- **Listening** toggle in the status bar — no output is scanned while it's off
- Works in Dev Containers and remote workspaces
