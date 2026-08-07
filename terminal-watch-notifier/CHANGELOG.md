# Change Log

All notable changes to the "terminal-watch-notifier" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.2] - 2026-08-06

- Declared `"api": "none"`. VS Code only supports `extensionDependencies` across extension hosts (e.g. Terminal Watch running in a Dev Container) when the providing extension exports no API. The notifier never exported one, so this is behavior-neutral for existing users.

## [Unreleased]

- Initial release
