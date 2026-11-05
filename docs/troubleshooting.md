# Troubleshooting

Start with the app package itself: confirm that all required split APKs and OBB expansion files are present, and check the [compatibility notes](./compatibility.md) before treating an app-specific failure as a general runtime failure.

## Troubleshooting

<details>
<summary><strong>The startup movie does not play</strong></summary>

Stubuika uses OpenH264 for H.264 decoding. The supported Constrained Baseline profile does not cover every game's videos: many startup movies use Main or High profile features such as CABAC and B-frames. This is the case for Blade & Soul Revolution.

If Stubuika processes 16 access units without producing a decoded frame, it reports `MEDIA_ERROR_UNSUPPORTED` to the guest. This lets a compatible game engine skip the video rather than waiting indefinitely on a blank screen.

Streams using the supported profile, including the opening video of Blade & Soul Masia, can reach `BUFFER_FLAG_END_OF_STREAM` when OpenH264 is installed (`make fetch-openh264`). AAC decoding uses the host's libavcodec when available. Set `LUNARIA_TRACE_MEDIA=1` to inspect codec activity.

</details>

<details>
<summary><strong>The game reports “project file not found”</strong></summary>

The app may require an OBB expansion file. Place it beside the APK and keep its original filename.

</details>

<details>
<summary><strong>A runtime stub library is missing</strong></summary>

Build the requested targets explicitly:

```bash
make runtime/libmediandk.so runtime/libGLESv3.so
```

</details>

<details>
<summary><strong>The screen is black or startup stalls</strong></summary>

First verify that all split APKs and required OBB files are present. If the app still stalls, capture a focused trace:

```bash
LUNARIA_TRACE_EXC=1 LUNARIA_DUMP_LAST_SVC=1 \
./stubuika game.apk 2>&1 | tee stubuika.log
```

For Unreal Engine 5 titles, use a hardware-accelerated OpenGL driver when possible. `LIBGL_ALWAYS_SOFTWARE=1` forces llvmpipe software rendering, which can make startup dramatically slower and resemble a hang.

</details>

<details>
<summary><strong>Rendering is slow</strong></summary>

Mesa llvmpipe is useful for headless rendering tests, but its software rasterization is not representative of GPU performance. For interactive use, enable hardware-accelerated EGL/OpenGL. On AArch64, test `LUNARIA_A64_ENGINES=4` after confirming the single-engine configuration is stable. Leave `LUNARIA_SLICE_DETAIL` and `LUNARIA_SVC_HISTO` disabled during benchmarks.

</details>

<details>
<summary><strong>Clicks do nothing</strong></summary>

GLFW ignores synthetic clicks from `xdotool` and `XSendEvent`. Click in the actual GLFW window, inject taps with `LUNARIA_TOUCH_TEST='50,84;…'` (framebuffer percentages, or append `px` for guest pixels), or use `LUNARIA_TOUCH_FIFO` after startup. Right-click is reserved for Stubuika’s host menu.

</details>
