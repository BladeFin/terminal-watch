# Change Log

All notable changes to the "terminal-watch" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.3] - 2026-08-06

- Fixed activation in Dev Containers and remote workspaces. `terminal-watch-notifier` now declares `"api": "none"`, which lets VS Code satisfy the cross-host `extensionDependencies` even though the notifier runs on the local UI host. Previously, Terminal Watch could not activate in a container because its dependency was not loaded in the container's extension host.

## [0.0.2] - 2026-08-06

- Split desktop notification handling into the new **Terminal Watch Notifier** extension (`terminal-watch-notifier`).
- `terminal-watch` now runs entirely in the workspace and delegates desktop notifications to the UI-host extension via the `terminal-watch-notifier.notify` command.
- Removed the `node-notifier` runtime dependency from this extension.
- Added `extensionDependencies` on `BladeFin.terminal-watch-notifier` so installing Terminal Watch also installs and activates the notifier.
- Desktop notifications fall back to an in-editor notification if the notifier extension is unavailable.

## [0.0.1] - Initial release
