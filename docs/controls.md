# Keyboard, mouse, and frame capture

## Keyboard controls

Stubuika translates keyboard and mouse input into touchscreen gestures, making games with on-screen controls easier to use on a desktop.

Open **Keyboard Controls** from the right-click menu to select a bundled layout or load your own configuration file. You can switch layouts without restarting the game. Choose **Off** to disable mapping, or **Reload Current File** to apply your edits. If a configuration fails to load, the current mapping remains active.

For pinch gestures, hold **Ctrl** and scroll over the game: scroll up to spread two fingers, down to bring them together. The cursor marks the center of the gesture. Release other mouse and keymap touches before pinching.

```sh
LUNARIA_KEYMAP=genshin ./stubuika /path/to/Genshin.xapk
LUNARIA_KEYMAP=crossworlds ./stubuika /path/to/CrossWorlds.apks
```

The included Genshin Impact and Cross Worlds layouts use **WASD** for movement, **F** for attacks, **E/Q/1/2/3** for abilities or character selection, and **Space** and **Shift** for jumping, dashing, or dodging depending on the game. Drag with the left mouse button to move the camera. Keyboard movement, mapped touch buttons, and mouse controls work simultaneously.

Text fields take precedence over game mappings, so you can type normally. When the window loses focus, Stubuika automatically releases held keys to prevent stuck input.

To create a custom layout, copy a file from `keymaps/*.conf`, edit its touch coordinates, then set `LUNARIA_KEYMAP=/path/to/my.conf`. You can also save this setting in `stubuika.conf`, or use `LUNARIA_KEYMAP=off` to disable it.

```text
stick 0.15625 0.764 0.18
walk CTRL 0.04
button SPACE 0.922 0.665
button F 0.826 0.769
```

`stick` defines the virtual joystick center and radius, controlled by **WASD**. `button` assigns a key to a touch position. X/Y coordinates range from **0 to 1** relative to the screen width and height; joystick radius is measured against the shorter side. `walk` reduces the joystick radius while the specified modifier key is held. In the Genshin layout, **WASD** runs and **Ctrl + WASD** walks.

You can define up to **eight buttons and eight macros**. Supported key names are uppercase letters, digits, `SPACE`, `SHIFT`, and `CTRL`. The bundled maps assume a landscape HUD; adjust the coordinates if you change the on-screen layout.

### Simultaneous taps, timed input, recording

```text
button F 0.10 0.20 0.30 0.40 0.50 0.60     # one key, three contacts at once
button G 0.70 0.70 repeat=100 hold=20      # tap every 100 ms while held, 20 ms each
macro Z 0.5,0.5|0.6,0.6/40 @100 0.9,0.9    # two taps together for 40 ms, wait 100 ms, tap
macro X 0.1,0.1 loop                       # keep running while the key is held
```

A `button` supports up to four simultaneous touch points. `repeat=MS` repeats a tap every 10–60,000 ms while a key is held; `hold=MS` controls its duration (30 ms by default, or half the repeat interval if shorter). A `macro` combines taps (`x,y`), simultaneous contacts (`|x,y`), hold times (`/MS`), and delays (`@MS`). Add `loop` to repeat while the key is held. Timing is tied to the frame clock, approximately 16 ms per frame at 60 fps.

Press **F9** (or choose **Record Input**) to record touchscreen input from the mouse, keymaps, and macros. Recordings are saved as `~/Documents/Stubuika <date>.rec` (falling back to `~/`). Press **F10** (**Play Recording**) to replay the latest recording, or select a file with `LUNARIA_PLAY`. Set `LUNARIA_PLAY_LOOP=1` to repeat it. Positions are stored relative to the view, so recordings work at different window sizes.

## Capture frames

To freeze the game for inspection, right-click and choose **Pause**; choose **Resume** to continue. The host menu remains available, but input is not forwarded to the paused guest. Pause state is not saved between sessions.

Capture selected swap indices:

```bash
mkdir -p /tmp/stubuika-shots
LUNARIA_DUMP_DIR=/tmp/stubuika-shots \
LUNARIA_DUMP_FRAME=0,60,120 \
./stubuika game.apk
```

Or capture every *N* swaps:

```bash
LUNARIA_DUMP_DIR=/tmp/stubuika-shots \
LUNARIA_SCREENSHOT_EVERY=60 \
./stubuika game.xapk
```

Captured frames are saved as PNG files such as `stubuika_0000.png`. Creating the file named by `$LUNARIA_SHOT_TRIGGER` (default `/tmp/stubuika-shot`) requests one additional capture. **F12** and **Take Screenshot** from the host menu instead save to `~/Pictures/Stubuika YYYY-MM-DD HH.MM.SS.png`.
