# Runtime architecture

This page describes the execution path and the main source directories. For user-facing settings, see [Configuration](./configuration.md).

## How it works

```text
 APK / APKM / XAPK / APKS / AAB
     │  extract base modules, splits, native libraries, assets and OBB
     ▼
 Android ELF loader ─── relocations and dependency resolution
     │
     ▼
 dynarmic JIT ───────── ARMv7 or AArch64 guest instructions
     │
     ├── SVC bridge ─── libc · pthread · filesystem · Android APIs · sockets
     ├── JNI / DVM ─── classes · methods · AssetManager · MediaCodec · dex
     ├── WebView ────── Chrome DevTools pipe · Chrome/Chromium or luna-browser
     └── graphics ───── EGL · OpenGL ES 3 · optional Vulkan · host GPU
```

- **ARM32:** a flat 4 GiB guest memory window with fastmem.
- **ARM64:** guest virtual addresses map directly to host addresses. Loaded ELF images, trampolines, JNI tables, and stacks occupy a high-address region so dynarmic can use fastmem. Set `LUNARIA_A64_ENGINES` (1–8, chosen automatically from host core count by default) to run multiple guest workers on host threads. The launcher enables `LUNARIA_A64_SELF_SCHED=1`, allowing engines to schedule runnable guests independently; set it to `0` to synchronize at each frame-pump pass. This can improve throughput, although a Cross Worlds security module has been observed to abort after approximately 25 seconds with self-scheduling enabled.
- **Native calls:** guest libc, EGL, GLES and JNI calls cross generated
  `SVC #n` trampolines into host implementations.
- **Guest libraries:** `make syslib` fills `syslib-arm64/` with AArch64 libm,
  libc and libz that run as guest code. `make guestlib` adds
  `liblunaria_guest.so` for routines that should not trap on every call
  (a zero-time `nanosleep` is the current one). The launcher points
  `LUNARIA_SYSLIB_DIR` at that directory when it exists.
- **Threads:** guest pthreads use cooperative round-robin scheduling, with a separate JIT context for each worker. Unlocking a mutex can hand execution directly to a waiting thread. Guest sleeps follow wall-clock time; blocking reads can be parked with `LUNARIA_FD_PARK`.
- **Java:** when a JNI call has no host stub, `src/dvm/` executes the method
  from the APK's `classes*.dex` (`LUNARIA_DVM=1` by default).
- **App lifecycle:** Stubuika starts the manifest-defined `Application` and content providers before calling the launcher `Activity`’s `onCreate`, `onStart`, and `onResume`. Native-activity engines reach `ANativeActivity_onCreate` through `android.app.NativeActivity`, with window and input events delivered through the usual `APP_CMD_*` commands.
- **Libraries:** a `System.loadLibrary` root heads the lookup scope of its own
  dependencies, as Android's linker does, so an engine's allocator replaces the
  one inside `libc++_shared.so`.
- **Assets:** `AssetManager` reads DEFLATE/STORE entries from APKs and OBB
  expansion files.
- **Audio:** OpenSL ES, AAudio, and Java `AudioTrack` share a mixer that outputs through ALSA. Blocking `AudioTrack.write()` calls do not stall the frame pump.
- **Media:** the NDK media support lives in its own translation units instead
  of per-call stubs. `src/luna_media_format.c` implements `AMediaFormat` over
  an opaque native representation, with the NDK key names coming from
  `src/luna_media_format_keys.inc`. `src/luna_media_codec.c` builds the
  encoder state machine on top of it and loads the FDK AAC encoder
  (`libAACenc`) with `dlopen` through the shim in `src/luna_aac_encoder.c`.
  `src/luna_native_codec.c` is the component plumbing the `AMediaCodec*`
  entry points dispatch through. H.264 decoding still goes to openh264 and
  AAC decoding to libavcodec when present; `LUNARIA_OPENH264` and
  `LUNARIA_LIBAVCODEC` override those shared-library paths, and when a
  library is absent the component reports itself unavailable instead of
  failing the launch.
- **Certificates:** `src/luna_certs.c` points the guest's trust store at the
  host's CA bundle (honouring `SSL_CERT_FILE`, then the usual distribution
  paths) and writes the hashed-subject layout `X509_STORE` expects, which is
  what guest TLS — and therefore most app networking — validates against.
- **Asset reads:** `src/file_read_cache.h` is a 64 KiB positional-I/O
  read-ahead cache for immutable assets. It never moves the caller's seek
  position, so a guest that reads the same package region repeatedly stops
  paying for a syscall per access. `src/luna_raster_jobs.h` is a small worker
  pool that lets canvas rasterisation for one frame run on several cores.
- **WebView:** `android.webkit.WebView` talks to a host browser over the
  DevTools pipe. `LUNARIA_WEB_ENGINE` is `auto` (Chrome or Chromium if one is
  installed, otherwise luna-browser), `chrome`, `luna`, or `off`.
  `LUNARIA_WEB_BROWSER` names a binary directly. The page is shown as an image
  inside the view; touch and text go back over the same pipe. Build the
  fallback with `make luna-browser`.
- **Vulkan:** when supported by the host bridge, guest `vk*` calls reach the host Vulkan loader. Stubuika emulates Android surfaces and swapchains and forwards the presented image to its compositor. Games that do not use Vulkan continue through GLES—the rendering path used for the demonstrated games above.

## Repository map

| Path | Role |
|---|---|
| `src/arm_exec.cpp` | dynarmic engines, SVC dispatch, JNI, EGL/GLES and threading |
| `src/arm.c` / `src/arm.h` | shared ARM execution lock and multi-engine helpers |
| `src/dvm/` | Dalvik bytecode interpreter for the APK’s original `classes*.dex` |
| `src/loader.c` | runtime entry point: Application, providers, launcher Activity, and the frame pump |
| `src/dvm/dvm_media.c` | Java `AudioTrack` queues shared with the output mixer |
| `src/dvm/apk_signers.c` | APK signing-block parsing behind `PackageInfo` signatures |
| `src/linker/` | Android ELF linker adapted for the host |
| `src/jvm/` | lightweight JVM/JNI object model and stubs |
| `src/lib/` | host implementations exposed to Android native code; `guest.c` is the in-guest libc |
| `src/luna_vulkan.c` | Vulkan bridge, enabled when a host driver is available |
| `src/luna_media_codec.c` | native media encoder state machine (FDK AAC via `dlopen`) |
| `src/luna_media_format.c` | `AMediaFormat` over an opaque native representation |
| `src/luna_media_format_keys.inc` | the `AMediaFormat` key-name table |
| `src/luna_native_codec.c` | component plumbing behind the `AMediaCodec*` entry points |
| `src/luna_aac_encoder.c` | `libAACenc` shim used by the media codec |
| `src/luna_certs.c` | host CA bundle discovery and hashed-subject trust store |
| `src/file_read_cache.h` | positional-I/O read-ahead cache for immutable assets |
| `src/luna_raster_jobs.h` | worker pool for parallel canvas rasterisation |
| `src/dvm/dvm_stream.h` | `java.util.stream` support for the bytecode emulator |
| `src/dvm/dvm_shortcut.h` | `ShortcutInfo` values and builder bindings |
| `src/cli.c` | Stubuika CLI and terminal dashboard (`stubuika launch|tui|apps|logs|diagnostics`) |
| `src/luna_overlay.c` | Launcher overlays, startup display, host menu, and guest-frame compositing |
| `src/luna_boot.c` | the boot card: sky, snow, progress ring, wordmark, translation and dex lines |
| `src/luna_ime.c` | host IME bridge into guest text input |
| `src/webview_cdp.c` | DevTools pipe client shared by Chrome and luna-browser |
| `luna-browser/` | the built-in WebView engine (luna-ui + QuickJS); `make luna-browser` |
| `keymaps/` | bundled touch maps (`genshin.conf`, `crossworlds.conf`) |
| `stubuika.conf.sample` | device profile, data root, screen scale, package ledger, WebView engine |
| `runtime/` | generated Android-compatible host shared libraries |
| `src/apk.c` | Package extraction, APK/XAPK/APKS/AAB handling, manifest parsing, caching, and launch |
| `src/luna_unicode.c` | compiled Unicode classification, normalization and IDNA2003 |
| `PROGRESS.md` | detailed compatibility notes and current engineering work |
