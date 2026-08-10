# Changelog

## [1.0.0] - 2026-08-09

First release of Terminal Watch Notifier.

- Raises native OS desktop notifications with `node-notifier`
- Runs on the UI host, so notifications reach your desktop even when Terminal Watch runs in a container, over SSH, or in WSL
- Declares `"api": "none"` so Terminal Watch can depend on it across extension hosts
