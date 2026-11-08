# Command-line and terminal interface

The normal package invocation remains unchanged and is the recommended interface for scripts:

```sh
stubuika ./game.apk
stubuika ./game.apkm
stubuika ./game.xapk
stubuika ./game.apks
stubuika ./game.aab
```

`stubuika` with no arguments continues to open the desktop launcher. The TUI is explicit, so redirected input and automation never unexpectedly enter an interactive screen.

## Commands

| Command | Purpose |
|---|---|
| `stubuika --help` | Show command usage and supported package suffixes. |
| `stubuika --version` | Identify the current development build. |
| `stubuika launch FILE` | Launch one supported package through the existing Stubuika loader and runtime. |
| `stubuika tui` | Open the keyboard-oriented terminal dashboard. Requires terminal stdin and stdout. |
| `stubuika apps` | Print recently launched package paths, newest first. |
| `stubuika logs FILE` | Print a saved stdout/stderr log; the TUI can show its latest lines. |
| `stubuika diagnostics` | Report host, display-session, runtime-directory, guest-syslib, and configuration status. |
| `stubuika diagnostics --json` | Emit a JSON diagnostics object for scripts and support reports. |

The CLI returns `0` for successful informational commands and a non-zero status for invalid usage or an unavailable interactive terminal. Runtime launch failures retain the existing loader's exit behavior. The CLI does not implement a second package loader: `launch` and TUI selections are passed to the same APK/APKM/XAPK/APKS/AAB preparation and execution path as the desktop app.

## TUI navigation

Run `stubuika tui` in a terminal. Use **Up/Down** or **j/k** to navigate and **Enter** to open a page. **q** exits, and **Esc** backs out of a picker. The package picker starts in the current directory and lists package files and folders. Recent packages are stored in the user's local Stubuika data directory; the settings page sets session overrides for the device profile, display size, and data root. Put persistent defaults in `stubuika.conf` or use the existing `LUNARIA_*` environment variables.

The dashboard includes recent launches, runtime diagnostics, and settings. The diagnostics page reports host-side facts and does not attempt to declare an app compatible. EGL/driver initialization, guest memory faults, and Android app integrity checks are separate launch-time concerns; include the full stderr output when reporting a failure.

## Support reports

Use machine-readable diagnostics with:

```sh
stubuika diagnostics --json > stubuika-diagnostics.json
stubuika ./problem-app.apkm > stubuika-run.log 2>&1
stubuika logs stubuika-run.log
```

The diagnostics report does not contain package content or signing material. Do not send an APK unless you have permission to share it. For a PairIP or other integrity-check failure, include the exact exception, app version/source, host OS, and whether the exact original package was used; do not disable the app's verification to work around the result.
