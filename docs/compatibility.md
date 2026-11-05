# Compatibility

Compatibility is experimental and changes as the runtime evolves. The table records observed behavior for particular builds and test environments; it is not a certification or guarantee.

## Compatibility

These results describe **what was actually observed**, not a promise that every feature of a title works. Support varies by version, platform, graphics driver, and game engine. Use the repository issue tracker for new reports; include the title version, ABI, stage reached, and logs.

| Title | Engine / ABI | Current result |
|---|---|---|
| **Ni no Kuni: Cross Worlds** | Unreal Engine 4 · AArch64 XAPK | On Linux: login, server and character selection, the starting village, dialogue, voiced cutscenes, and gameplay in the field; SharedPreferences persist. On Apple Silicon macOS, version 5.04.12 displayed the opening movie, 3D intro, and terms dialog; behavior after accepting the terms has not been verified. |
| **Blade & Soul Masia** | Unreal Engine 5 · AArch64 APKS | Opening video completes, the title screen appears, and accepting the additional-patch prompt starts the download. |
| **Genshin Impact 7.1.0** | Unity IL2CPP · AArch64 XAPK | Reached the open world on Linux, including the prologue, Mondstadt, and gliding. Login, server selection, and audio settings survived restart. Keyboard movement worked; one test host measured approximately 18–22 fps in the field and 30 fps in menus. Account WebView opened; Google Play billing is not supported. |
| **Alchemia Story 1.0.154** | Unity IL2CPP · AArch64 APK | Title screen, story scenes with Japanese dialogue in landscape and portrait, and the character-creation room draw (2026-10-09) |
| **Kikyu! Aeronaut** | native `armeabi` · ARM32 APK (2013) | Title screen draws and waits for Return |
| **Between Two Worlds** | Unity 2023 IL2CPP · ARMv7 | Playable; reaches the main story scene |
| **Between Two Worlds** | Unity 2023 IL2CPP · AArch64 | Main menu on a recorded run; recent checks reach language selection at about 70 fps |
| **FPSMobile** | Unreal Engine 4 · ARMv7 | FirstPersonExampleMap renders; 16,000+ swaps observed |
| **UnitySampleGame** | Unity · ARMv7 | Start opens the 3D gameplay scene; rendering continues |
| **TIME LOCKER** | Unity · ARMv7 | Reaches the portrait tutorial gameplay scene |
| **Black Clover: Asta Fight** | Unity IL2CPP · AArch64 XAPK | Base + split load; title menu, stage selection and gameplay render headlessly |
| **Blade & Soul Revolution** | Unreal Engine 4 · AArch64 | Boots through dex / SDK setup into the game's own dialog; without a route to the patch server the client asks to reconnect |
| **Trickcal Chibi+Go 1.6.1** | Unity 6000.3.13f1 IL2CPP · ARMv7 XAPK | Terms Activity and server-configuration loading screen observed. Startup remains under investigation; gameplay has not been verified. |
| **TVer** | Java / dex Android UI | Welcome screen with program artwork and consent button renders. End-to-end video playback has not been verified. |
| **APKPure 3.20.8002** | Java / dex Android UI | Store, recommendations, app details, and download manager render; HTTP download progress observed. Completed downloads, installation, and launching the installed app have not been verified. |
| **Another Eden** | Native · ARMv7 XAPK | Existing-account load screen observed. Loading the game aborts; gameplay has not been reached. |
| **Daggerfall Unity** | Unity Mono · ARMv7 | Mono starts, but rendering is not yet working. |

<details>
<summary><strong>Run the open-source test titles</strong></summary>

### FPSMobile / Unreal Engine 4

Source: [Abhishrut/UnrealEngineAndroidSamples](https://github.com/Abhishrut/UnrealEngineAndroidSamples)

Place both files in `test/`; the launcher discovers a same-directory OBB
automatically.

```bash
curl -L -o test/FPSMobile-armv7.apk \
  "https://raw.githubusercontent.com/Abhishrut/UnrealEngineAndroidSamples/main/FPSMobile-armv7.apk"
curl -L -o test/main.1.com.YourCompany.FPSMobile.obb \
  "https://raw.githubusercontent.com/Abhishrut/UnrealEngineAndroidSamples/main/main.1.com.YourCompany.FPSMobile.obb"

LUNARIA_ARCH=armeabi-v7a ./stubuika test/FPSMobile-armv7.apk
```

### Between Two Worlds / Unity 2023 IL2CPP

Source: [ShutovKS/Between-two-worlds](https://github.com/ShutovKS/Between-two-worlds/releases/tag/1.0.5)

```bash
make fetch-btw

LUNARIA_ARCH=armeabi-v7a ./stubuika test/btw-android.apk
LUNARIA_ARCH=arm64-v8a  ./stubuika test/btw-android.apk
```

The release file is an Android App Bundle despite its `.apk` extension.
The native launcher reads its protobuf manifest and installs the base module
and Unity asset pack directly; `.aab` filenames are also accepted.


### Daggerfall Unity / Unity Mono

Source: [Vwing/daggerfall-unity-android](https://github.com/Vwing/daggerfall-unity-android/releases/tag/v1.1.1.8)

```bash
make fetch-libunity
./stubuika test/dfu-mono-32bit.apk
```

</details>

## Project status

Stubuika is **research software under active development**. It has known API gaps, title-specific failures, diagnostic output, and breaking changes. Test results are snapshots of particular builds and machines—not guarantees of compatibility.

- **Linux:** Captured guest framebuffer output matches the GLFW window in the tested configuration.
- **Apple Silicon macOS:** A distributable build is available through `make dist-mac`, but the visible window may remain black even when guest frames are being rendered. Some test runs, including Cross Worlds 5.04.12, reached the opening movie, 3D intro, and terms dialog.
- **Windows:** `make dist` produces a ZIP with a bundled executable and dependencies. Extracted builds have passed ARM32/ARM64 ABI and EGL/GLES initialization checks under Wine; display and audio on native Windows hardware have not yet been verified.

Distribution builds use `-O3`, `-DNDEBUG`, and LTO. Dynarmic is rebuilt separately in Release mode with IPO, without `-march=native`, so the binaries are not tied to the build machine's CPU.

**Contributions and reproducible reports are welcome.** For compatibility issues, please include the title, engine version, guest ABI, last working screen or stage, relevant logs, and—if possible—a captured framebuffer image.

Licensed under the [Mozilla Public License 2.0](../LICENSE).

Original Lunaria code © 2026 Yuichiro Nakada; Stubuika maintains the upstream MPL-2.0 notices.

## Reporting a result

Please include the app/game version, engine (when known), guest ABI, host OS and GPU/driver, the last screen or stage reached, relevant logs, and a screenshot or frame capture where possible.
