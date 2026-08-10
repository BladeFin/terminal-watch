# Changelog

## [1.0.1] - 2026-08-09

Fixes desktop notifications not firing after the 1.0.0 esbuild bundle.

- Bundling flattened all of node-notifier into one file, but node-notifier needs its vendored platform binaries (`snoretoast.exe` on Windows, `terminal-notifier.app` on macOS) — they were left behind, so notifications failed silently
- The bundle script now copies `node-notifier/vendor/**` into the extension so the binaries ship in the VSIX
- Added a pre-flight binary check and error callback so future notification failures are visible instead of silent

## [1.0.0] - 2026-08-09

First release of Terminal Watch Notifier.

- Raises native OS desktop notifications with `node-notifier`
- Runs on the UI host, so notifications reach your desktop even when Terminal Watch runs in a container, over SSH, or in WSL
- Declares `"api": "none"` so Terminal Watch can depend on it across extension hosts
