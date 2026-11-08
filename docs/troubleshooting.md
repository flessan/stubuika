# Troubleshooting

Start with the app package itself: confirm that all required split APKs and OBB expansion files are present, and check the [compatibility notes](./compatibility.md) before treating an app-specific failure as a general runtime failure. For CLI commands and structured host checks, see [CLI and TUI](./cli.md).

## Separate graphics failures from application integrity failures

A startup graphics error and an Android app's self-integrity exception are different failure domains. Preserve the complete, timestamp-ordered `stderr` log and report the exact failing operation rather than treating a later app exception as an EGL issue.

### Linux EGL / GLFW initialization

`EGL_BAD_PARAMETER` is `0x300c`. On the desktop launch-card path, EGL is initialized only after GLFW creates a `GLFW_NO_API` window. The sequence is: acquire GLFW's selected native display, call `eglGetDisplay`, initialize EGL, bind the OpenGL ES API, choose a window-capable config, acquire the backend-native EGL window, create the window surface, create an ES 3 context, and make it current. A null native display or a missing Wayland `wl_egl_window` is not a valid EGL handle. Earlier releases passed that value onward, which could result in an EGL parameter error with no indication of which stage failed.

The launcher now checks the GLFW native display and window handles before EGL receives them and reports the failed stage (`eglGetDisplay`, `eglChooseConfig`, `eglCreateWindowSurface`, `eglCreateContext`, or `eglMakeCurrent`) separately from an Android package/integrity failure. The app runtime also reports EGL error values at native display/API setup and refuses to send a null native window to EGL. On Linux, verify that the selected GLFW backend matches the available session (`WAYLAND_DISPLAY` or `DISPLAY`), that Mesa's EGL/GLES and the backend's native-window support are installed, and that `LUNARIA_PBUFFER=1` can initialize a surfaceless Mesa context when testing headlessly. A pbuffer is a graphics diagnostic/fallback, not a way to make an interactive GUI work without a display.

When diagnosing a Linux package, capture:

```sh
stubuika diagnostics --json
stubuika ./Win7-Simu.apkm > stubuika.log 2>&1
```

Include the `native display`, GLFW backend, EGL stage and error code, EGL vendor/version, graphics driver, X11/Wayland session, and Mesa version when available. Do not infer a specific Mesa defect from `0x300c` alone: that code identifies an EGL error class; the operation and invalid native parameter must be recorded too.

### Guest SIGSEGV and PairIP

`[arm64] SIGSEGV: guest load of unmapped memory` means the translated guest executed a load from an unmapped guest virtual address. It is not an EGL status. The emulator's fault report includes the guest address, PC, LR, SP, thread, and (when enabled) register/backtrace information. Use the faulting PC/LR plus the loaded module map to establish whether the instruction belongs to `libpairipcore.so`; an unmapped load alone does not prove that PairIP is the source. Preserve the complete crash report and do not change signal delivery or invent a value for the load.

A reliable root-cause diagnosis needs the exact Win7 Simu APKM and its selected base/split APKs, the full guest register/backtrace log, and the build/runtime revision. Package extraction, split selection, manifest parsing, and DEX loading succeeding only establishes that those earlier phases worked; it does not establish that PairIP's native runtime is compatible with the emulator. Without the exact package and guest PC/module mapping, a particular invalid pointer or PairIP ABI incompatibility cannot be concluded from the summary lines alone.

`com.pairip.SignatureCheck$SignatureTamperedException` is an application-level integrity decision. Stubuika's APK signing-block reader exposes signer certificates from a package; that does not bypass PairIP's own checks or prove the original APK's cryptographic provenance. Verify the package came intact from its legitimate publisher, compare its signing certificate with the publisher's expected certificate, and test the exact original package/version. Do not patch PairIP, disable verification, fake a signer, or suppress the exception. A signing failure must remain visible even when the graphics setup succeeds.

## The startup movie does not play

Stubuika uses OpenH264 for H.264 decoding. The supported Constrained Baseline profile does not cover every game's videos: many startup movies use Main or High profile features such as CABAC and B-frames. This is the case for Blade & Soul Revolution.

If Stubuika processes 16 access units without producing a decoded frame, it reports `MEDIA_ERROR_UNSUPPORTED` to the guest. This lets a compatible game engine skip the video rather than waiting indefinitely on a blank screen.

Streams using the supported profile, including the opening video of Blade & Soul Masia, can reach `BUFFER_FLAG_END_OF_STREAM` when OpenH264 is installed (`make fetch-openh264`). AAC decoding uses the host's libavcodec when available. Set `LUNARIA_TRACE_MEDIA=1` to inspect codec activity.

## The game reports “project file not found”

The app may require an OBB expansion file. Place it beside the APK and keep its original filename.

## A runtime stub library is missing

Build the requested targets explicitly:

```bash
make runtime/libmediandk.so runtime/libGLESv3.so
```

## The screen is black or startup stalls

First verify that all split APKs and required OBB files are present. If the app still stalls, capture a focused trace:

```bash
LUNARIA_TRACE_EXC=1 LUNARIA_DUMP_LAST_SVC=1 \
./stubuika game.apk 2>&1 | tee stubuika.log
```

For Unreal Engine 5 titles, use a hardware-accelerated OpenGL driver when possible. `LIBGL_ALWAYS_SOFTWARE=1` forces llvmpipe software rendering, which can make startup dramatically slower and resemble a hang.

## Rendering is slow

Mesa llvmpipe is useful for headless rendering tests, but its software rasterization is not representative of GPU performance. For interactive use, enable hardware-accelerated EGL/OpenGL. On AArch64, test `LUNARIA_A64_ENGINES=4` after confirming the single-engine configuration is stable. Leave `LUNARIA_SLICE_DETAIL` and `LUNARIA_SVC_HISTO` disabled during benchmarks.

## Clicks do nothing

GLFW ignores synthetic clicks from `xdotool` and `XSendEvent`. Click in the actual GLFW window, inject taps with `LUNARIA_TOUCH_TEST='50,84;…'` (framebuffer percentages, or append `px` for guest pixels), or use `LUNARIA_TOUCH_FIFO` after startup. Right-click is reserved for Stubuika’s host menu.
