# Stubuika

### Android apps and games, on your desktop.

Stubuika is an experimental Android compatibility runtime that runs Android application packages directly on desktop Linux, Windows, and macOS hosts, without booting a complete Android system image.

[![License: MPL 2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Guest architectures](https://img.shields.io/badge/guest-ARM32%20%7C%20ARM64-20232a.svg)](docs/architecture.md)
[![Package formats](https://img.shields.io/badge/packages-APK%20%7C%20APKM%20%7C%20XAPK%20%7C%20APKS%20%7C%20AAB-20232a.svg)](docs/package-formats.md)

[Downloads](https://github.com/flessan/stubuika/releases) · [Documentation](docs/README.md) · [Compatibility](docs/compatibility.md) · [Gallery](docs/gallery.md) · [日本語](README.ja.md)

> [!NOTE]
> **Stubuika is built on Lunaria.** This repository is a downstream fork of [Lunaria](https://github.com/yui0/lunaria), originally created by [Yuichiro Nakada](https://github.com/yui0). Lunaria provides the runtime foundation and a substantial part of the underlying implementation. Stubuika continues that work; it is not an independent, from-scratch implementation. See [Attribution and project lineage](docs/attribution.md).

## What it does

Instead of starting a virtual Android device, Stubuika loads the app's own package, translates ARM32 and ARM64 guest code with [dynarmic](https://github.com/merryhime/dynarmic), and bridges selected Android services, graphics, audio, and media paths to the desktop host. A built-in Dalvik interpreter executes app bytecode from the APK's original dex files.

It accepts APK, APKM, XAPK, APKS, and AAB packages. See [Package formats](docs/package-formats.md) for the exact loading behavior and current limitations.

## Screenshots

<p align="center">
  <img src="shots/genshin-mondstadt-night.png" width="100%" alt="Genshin Impact running in Stubuika, with the Traveler gliding above Mondstadt at night">
</p>

<p align="center">
  <img src="shots/cross-worlds-play.png" width="48%" alt="Ni no Kuni Cross Worlds gameplay running in Stubuika">
  &nbsp;
  <img src="shots/black-clover-gameplay.png" width="48%" alt="Black Clover Asta Fight gameplay running in Stubuika">
</p>

<p align="center"><sub>More captures and test notes: <a href="docs/gallery.md">gallery</a> · <a href="docs/compatibility.md">compatibility</a></sub></p>

## Get started

Prebuilt builds are published on [GitHub Releases](https://github.com/flessan/stubuika/releases). Linux and macOS users can use the installer script when a release is available:

```bash
curl -fsSL https://raw.githubusercontent.com/flessan/stubuika/master/install.sh | bash
```

Windows users can download the ZIP archive from Releases, extract it, and run stubuika.exe.

Launch a package from the command line, or open the graphical launcher:

```bash
stubuika /path/to/app.apk
stubuika /path/to/app.apkm
stubuika
```

For manual installation, platform requirements, source builds, and configuration, see [Installation and development](docs/installation.md).

## Current state

Stubuika is research software under active development. Some tested games reach gameplay; others only display a title screen, loading screen, or Android UI. Compatibility depends on the app version, ABI, host OS, graphics driver, and required Android services.

- Demonstrated titles include Genshin Impact, Ni no Kuni: Cross Worlds, Alchemia Story, Black Clover: Asta Fight, and Kikyu! Aeronaut.
- Java-based application UI support is progressing; showing a screen does not mean all app services or playback work.
- iOS IPA execution is out of scope. macOS is an optional desktop host, not an iOS runtime.

Check [Compatibility](docs/compatibility.md) before testing an app. For current limitations, use the [troubleshooting guide](docs/troubleshooting.md).

## Documentation

| Guide | Description |
|---|---|
| [Installation and development](docs/installation.md) | Download, install, dependencies, and build from source. |
| [Package formats](docs/package-formats.md) | APK, APKM, XAPK, APKS, AAB, split APKs, and ABI selection. |
| [Compatibility](docs/compatibility.md) | What has been tested and what remains unverified. |
| [Gallery](docs/gallery.md) | Screenshots with context for each demonstrated stage. |
| [Controls and capture](docs/controls.md) | Keyboard maps, macros, recording, and screenshots. |
| [Runtime architecture](docs/architecture.md) | How the loader and Android compatibility layers fit together. |
| [Configuration](docs/configuration.md) | Runtime variables and diagnostics. |
| [Troubleshooting](docs/troubleshooting.md) | Common problems and workarounds. |
| [Attribution](docs/attribution.md) | Lunaria credits, fork history, and licenses. |

## License

[MPL-2.0](LICENSE). See [Attribution](docs/attribution.md) for upstream credits and third-party notices.
