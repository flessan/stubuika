# Android package formats

Stubuika is designed around Android application packages. It does not boot a complete Android system image; it reads the app package, loads the required Android modules and native libraries, then starts the compatibility runtime.

## Supported inputs

| Extension | Typical contents | Handling |
|---|---|---|
| APK | One Android package, including its manifest, resources, dex files, and native libraries | Loaded as a single package. |
| APKM | APKMirror ZIP bundle containing a base APK and configuration/device split APKs | The ZIP is opened, the base APK is identified from its Android manifest, and matching splits are checked before loading. |
| XAPK | APK plus split APKs and sometimes OBB expansion data | The archive is extracted and its base/split APKs are combined into the runtime view. |
| APKS | Split APK archive, commonly produced by bundle tooling | The archive is inspected and the base and available splits are loaded together. |
| AAB | Android App Bundle with a base module and optional asset packs | The protobuf BundleConfig is read and the base module plus available asset packs are loaded. |

## APKMirror APKM details

An APKM file is a ZIP-based package bundle. Stubuika does not treat the outer file as a normal standalone APK. Instead, it:

1. Opens the APKM archive and locates the contained APK files.
2. Reads each contained APK's Android manifest.
3. Selects the base APK (the manifest entry whose split name is empty or absent).
4. Checks that candidate split APKs belong to the same Android package.
5. Exposes the selected package contents to the runtime without modifying the original archive.

The APKMirror info.json file is not currently required to choose the base APK or validate split package IDs. The outer APKMirror JAR signature is **not verified** by this parser; use packages from sources you trust.

## Extraction and caching

Package contents are extracted into the package cache under cache/packages/ inside the selected data directory. Use LUNARIA_CACHE_DIR to move the cache or LUNARIA_NO_CACHE=1 to disable persistent extraction caching.

OBB expansion files are discovered and linked where supported, avoiding unnecessary duplicate multi-gigabyte copies. Keep an app's OBB files beside the package or in the expected package data layout.

## ABI selection

Stubuika supports ARM32 (armeabi-v7a, with legacy armeabi code paths) and ARM64 (arm64-v8a). When a package contains multiple ABIs, choose one explicitly:

    LUNARIA_ARCH=armeabi-v7a ./stubuika game.apk
    LUNARIA_ARCH=arm64-v8a  ./stubuika game.apk

The original LUNARIA_* names remain available for compatibility with the upstream runtime. See [Configuration](./configuration.md) for the runtime controls.

## Important limitations

- Package parsing does not guarantee that the app's Android APIs, DRM, Google services, network services, or graphics paths are fully supported.
- APKM outer-container signature verification is not implemented.
- An AAB file may not contain every device-specific split required for a complete installation.
- Stubuika runs Android packages, not iOS IPA applications.
