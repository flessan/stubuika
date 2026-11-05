# Installation and development

This page covers prebuilt downloads, local installation, dependencies, and source builds. For supported archive formats, see [Package formats](./package-formats.md).

## Install

Prebuilt binaries are on [GitHub Releases](https://github.com/flessan/stubuika/releases).

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/flessan/stubuika/master/install.sh | bash
```

The script picks the asset for your OS and CPU from the latest release, installs under `~/.local` (or `/usr/local` with `sudo`), and adds a `stubuika` command. On macOS it also places `Stubuika.app` in `~/Applications` (or `/Applications` with `sudo`). Apple Silicon only for the macOS build.

```bash
# Specific release tag
curl -fsSL https://raw.githubusercontent.com/flessan/stubuika/master/install.sh | bash -s -- --version 2026.10.15

# System-wide prefix
curl -fsSL https://raw.githubusercontent.com/flessan/stubuika/master/install.sh | sudo bash -s -- --prefix /usr/local

# Uninstall (keeps stubuika.conf and app data)
curl -fsSL https://raw.githubusercontent.com/flessan/stubuika/master/install.sh | bash -s -- --uninstall
```

```bash
stubuika /path/to/app.apk    # or .apkm / .xapk / .apks / .aab
stubuika                      # graphical launcher
```

If `~/.local/bin` is not on your `PATH`, add it (for example `export PATH="$HOME/.local/bin:$PATH"`).

**Manual Linux:** unpack `stubuika-*-linux-x86_64.tar.gz` or `…-aarch64.tar.gz`, then run `./stubuika` from that directory. The archive ships its own shim libraries, host libraries, and fonts; it uses the system C library.

**Manual macOS:** open the `.dmg`, drag `Stubuika.app` where you like, then run  
`/Applications/Stubuika.app/Contents/MacOS/Stubuika /path/to/app.apk`.

### Windows

Download `stubuika-*-windows-x86_64.zip` from [Releases](https://github.com/flessan/stubuika/releases), unzip it, and run `stubuika.exe /path/to/app.apk` (or drag an APK onto the executable). No MSYS2 or extra runtime install is required.

To build from source instead, see [Build from source](#build-from-source).

## Build from source

For prebuilt builds, use the [GitHub Releases page](https://github.com/flessan/stubuika/releases). The steps below build Stubuika from source.

### 1. Install dependencies

**Ubuntu / Debian**

```bash
sudo apt install \
  build-essential cmake pkg-config \
  libboost-dev libbsd-dev libunwind-dev \
  libglfw3-dev libegl1-mesa-dev libgles2-mesa-dev \
  libssl-dev zlib1g-dev \
  libasound2-dev libvulkan-dev
```

`libvulkan-dev` provides headers for the optional Vulkan bridge. When a host Vulkan library is available, Stubuika enables the bridge by default. Set `LUNARIA_VULKAN=0` to disable it.

**macOS (Apple Silicon)**

Run `make` from this directory to download the pinned ANGLE, MoltenVK, and OpenH264 dependencies and build Stubuika. To open an XAPK, use `./stubuika /path/to/game.xapk`. See [Compatibility and project status](./compatibility.md#project-status) for current macOS display limitations.

**Windows (x86_64)**

Open the [MSYS2 UCRT64 shell](https://www.msys2.org/docs/environments/) and install:

```bash
pacman -S --needed git make zip unzip bzip2 \
  mingw-w64-ucrt-x86_64-{gcc,cmake,ninja,pkgconf,python,boost,glfw,angleproject,openssl,zlib,libgnurx,vulkan-headers}
```

Set `ANDROID_HOME` to the Android SDK directory (including the Build Tools' ARM64 RenderScript libraries) and `ANDROID_NDK_HOME` to the NDK directory. Then build the distributable:

```bash
make -j4 dist CC=gcc CXX=g++ DYNARMIC_JOBS=4
```

The Windows build combines the JVM, Dalvik interpreter, UI, and Android compatibility APIs into `stubuika.exe`. Run `.\stubuika.exe game.apk` from PowerShell after extracting the archive, or drag an APK onto the executable. The resulting application does **not** require MSYS2, Python, a separate shell, or ICU at runtime.

You can also cross-compile a Windows ZIP from Linux with `make -j4 dist-cross-win`. On its first run, this downloads MSYS2 UCRT64 dependencies, runtime DLLs, and Boost headers to `/tmp/stubuika-windows-deps`. Subsequent builds reuse the cache.

Cross-compilation requires UCRT-capable `x86_64-w64-mingw32-gcc/g++`, CMake, Ninja, Python 3.11 or newer, curl, tar with zstd support, zip, and the Android SDK/NDK described above. Intermediate files are stored under `/tmp/stubuika-cross-win` and `/tmp/stubuika-dist-build/cross-windows-x86_64`; the ZIP is written to this directory.

Set `WIN_DEPS=/path/to/deps` to reuse an existing dependency directory. Other overrides are `WIN_CROSS_PREFIX`, `WIN_ANGLE`, `WIN_GLFW_LIB`, `WIN_BOOST_INCLUDE`, `WIN_BUILD_DIR`, and `WIN_DIST_BUILD_DIR`. The ZIP includes required host DLLs, OpenH264, and the guest AArch64 libraries in `syslib-arm64/`; it omits ICU and host `runtime/*.so` shims. One recorded build produced an archive of approximately 35 MiB. Windows command-line arguments are converted from UTF-16 to UTF-8.

### 2. Build

WebP decoding uses the bundled [simplewebp](https://github.com/MikuAuahDark/simplewebp/blob/main/simplewebp.h) single-header C library (version 20260718), so no separate WebP codec package is needed. Its BSD license and patent grant are included in `LICENSE.simplewebp`.

```bash
make dynarmic-build
make x86_64 -j"$(nproc)"   # host is x86_64; plain `make` builds the 32-bit x86 ABI
```

`make` and `make x86_64` automatically fetch Cisco's OpenH264 shared library into `runtime/` for MediaCodec H.264 support. Run `make fetch-openh264` to refresh the library manually.

Run `make syslib` to populate `syslib-arm64/` with AArch64 `libm`, bionic `libc`, and `libz`. When the directory exists, the launcher points `LUNARIA_SYSLIB_DIR` to it. Audited arithmetic routines such as `pow` and `sincosf`, as well as memory routines, can then execute directly inside the guest JIT. System zlib calls use the host implementation through SVC, which has been faster in existing measurements.

`make guestlib` builds `liblunaria_guest.so` from `src/lib/guest.c`. It currently handles zero-duration `nanosleep` calls without returning to the host.

Stubuika embeds Unicode classification, normalization, and IDN tables. Legacy character encodings use Windows code pages or `iconv` on Linux/macOS; Windows date handling uses OS timezone rules and a compact CLDR mapping. **ICU is not required** for building or running Stubuika.

### Android framework resources

Android view themes and resource inheritance use the Android SDK Platform 31 resources. From this directory, install them with:

```bash
curl -fL https://dl.google.com/android/repository/platform-31_r01.zip -o /tmp/platform-31_r01.zip
python3 scripts/install-framework.py /tmp/platform-31_r01.zip
```

The installer verifies Google's SHA-1 and copies the resources and notices from
`android.jar` unchanged into `runtime/framework-res/`. Application APKs are not
modified. Set `LUNARIA_FRAMEWORK_RES` to use another directory containing
`resources.arsc` and `res/`. The default directory is relative to the executable.

### 3. Launch a package

```bash
./stubuika                         # open the launcher UI
./stubuika path/to/game.apk
./stubuika path/to/game.xapk
./stubuika path/to/game.apks
./stubuika path/to/game.aab
LUNARIA_ALSA_DEVICE="hw:7,0" ./stubuika Cross+Worlds_5.04.12_APKPure.xapk
```

To create a distributable package that does not depend on the build directory:

```bash
make dist        # stubuika-<version>-linux-x86_64.tar.gz
make dist-mac    # Stubuika.app + .dmg (Darwin only)
```

Stubuika handles package installation internally, including ZIP/ZIP64 archives, binary manifests, signature blocks, split APKs, OBB files, and extraction caches. It detects `arm64-v8a` or `armeabi-v7a`, locates the entry-point native library, and starts the Android compatibility runtime.

For APKMirror APKM, XAPK, and APKS files, Stubuika opens the ZIP container, finds the base APK from its Android manifest, validates split package IDs, and combines the selected APKs into its runtime view without modifying them. APKM `info.json` is not currently required for launch decisions, and the outer APKMirror JAR signature is not verified. For AAB files, it reads the protobuf `BundleConfig` and loads the base module and available asset packs. Extracted content is cached under `cache/packages/` in the selected data directory. Set `LUNARIA_CACHE_DIR` to move the cache or `LUNARIA_NO_CACHE=1` to unpack the package on every launch.

Extraction progress includes the percentage completed, MiB processed, file count, and current filename—even while copying individual large files. OBB aliases use hard links or symbolic links where possible, avoiding repeated multi-gigabyte copies.

Save persistent settings in `stubuika.conf` (see `stubuika.conf.sample`): device identity, guest data directory (`LUNARIA_DATA_ROOT`), WebView engine, and more. Environment variables override configuration-file values for the current run.

By default, Stubuika looks for `stubuika.conf` in its startup working directory and also stores guest data there. To choose another configuration file, use `--config FILE` or `LUNARIA_CONF`; to choose another data directory, use `--data-root DIR` or `LUNARIA_DATA_ROOT`. Relative paths are resolved from the startup directory, and paths containing spaces are supported.

```bash
./stubuika --config ./stubuika.conf --data-root "/mnt/games/Stubuika data" game.xapk
# macOS: --data-root /Volumes/Games/Stubuika
# Windows shell: --data-root D:/Games/Stubuika
```

**Multiple accounts, one installation.** Profiles share the installed package and designated game resources, but keep preferences, databases, login files, and other personal data separate. The `default` profile continues to use the existing data directories.

```bash
./stubuika --choose-profile game.xapk
./stubuika --profile account2 game.xapk
./stubuika --list-profiles game.xapk
```

Profile names are their data directory names under `profiles/<package>/`. The launcher, right-click menu, and `--list-profiles` use those same names. The `default` profile uses `data/<package>/`.

Set `LUNARIA_PROFILE_PROMPT=1` to select a profile at every launch. `LUNARIA_SHARED_ASSETS` accepts colon-separated shared resource names; `LUNARIA_PROFILE_SEED_FILES` lists resource files to copy once into a new profile. The sample configuration includes the Genshin Impact resource layout. Each new profile starts with its own login state.

**Optional Google services.** Open **Google services** in the right-click menu to install a local Google Play services APK/XAPK. The same installer also accepts Play Store and Google Services Framework packages when an app needs them. Original archives, including splits, are retained under the current data folder; running applications need a restart after installation.

Use **Sign in to a new environment…** once to create a separate GMS environment. Its Google application data and AccountManager store remain under `system/gms/gms-N/` in the current data folder. Choose a saved environment in another app's right-click menu and restart that app to reuse it. Selecting an environment saves the app's choice without opening authentication. The menu shows the number of saved Google accounts and suppresses duplicate sign-in windows for the same environment.

The `default` GMS environment retains the existing Google application data and `system/accounts.tsv`. Existing launches with `LUNARIA_LAUNCH_ACTIVITY=com.android.settings.accounts.AddAccountSettings` continue to use it. A named environment can also be selected with `LUNARIA_GMS_PROFILE=gms-2`; it is independent of the game's `--profile` setting.

```bash
./stubuika --google-services --data-root /path/to/data
# Headless package installation, without starting authentication:
./stubuika --data-root /path/to/data --install-system GooglePlayServices.xapk
```

If a package contains multiple ABIs, select one explicitly:

```bash
LUNARIA_ARCH=armeabi-v7a ./stubuika game.apk
LUNARIA_ARCH=arm64-v8a  ./stubuika game.apk
```

## Notes

- Stubuika is experimental. A successful build does not imply that every Android app or game will run.
- The LUNARIA_* runtime environment variable names are retained for compatibility with the upstream codebase. See [Configuration](./configuration.md) for runtime options.
- Package parsing and split-selection details are documented in [Package formats](./package-formats.md).
