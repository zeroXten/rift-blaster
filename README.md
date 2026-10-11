# Rift Blaster

A browser AR shooter for phones. The rear camera shows your room, rifts tear open in the space
around you in 360°, and things from other dimensions push through. Hold the phone sideways in
both hands, turn to aim, fire with your right thumb, and hold the crosshair on a rift to seal
it. The scanner has opinions.

Plain HTML, CSS and JavaScript modules: no build step, no libraries, no backend, no asset files.
Sprites, font, sound effects and music are all generated in code. See [SPEC.md](SPEC.md).

## Play

Camera and motion sensors need HTTPS, so play it from GitHub Pages (Settings → Pages → deploy
from the `main` branch root) on iPhone Safari or Android Chrome. It plays in landscape only: on
an iPhone, rotation lock has to be off; on Android, starting an incident goes full screen and
turns the screen for you.

The third key on the left of the casing switches full screen on and off. iPhones do not let a
web page go full screen: use Share → Add to Home Screen and open the game from that icon.

## Develop

ES modules need a web server; any static one will do:

```bash
python3 -m http.server 8123
```

Opened on a device without a touch screen, the game runs in **desktop mode**: mouse look, with
the webcam standing in for the rear camera. If the webcam is refused or missing, or with
`?debug` in the URL (which never asks for it), the backdrop is a plain dot lattice instead.

| Input | Action |
|---|---|
| Drag, arrow keys or WASD | Look |
| Click the screen or the FIRE button, or Space | Fire |
| P / Esc | Pause |
| F, or the key on the left of the casing | Full screen, in and out |
| R | Recalibrate |
| 1–5 on the title screen, or `?incident=N` | Start at that incident |

In debug mode `window.riftDebug` is available in the console: `riftDebug.look(yaw, pitch)` in
degrees, `riftDebug.step(seconds)` to advance the simulation, and `riftDebug.game`.

## Layout

```
index.html, css/style.css
js/main.js          bootstrap, input, state machine
js/config.js        tunable constants (field of view, heat, seal time, ...)
js/incidents.js     incident definitions and per-dimension spawn rules (data)
js/scanner.js       every scanner line (data) and speech
js/orientation.js   sensor -> quaternion, smoothing, recalibrate, debug look
js/projection.js    bearing -> screen position
js/render.js        low-resolution canvas, camera palette reduction, pixel primitives
js/sprites.js       sprite grids and palettes
js/font.js          pixel font
js/rift.js          rift stages, spawning, sealing, rift art
js/creatures/       yrrk, glomm, skaith, ootheen, ummagog
js/weapon.js        aiming, heat, seal-by-gaze
js/game.js          one incident in play
js/frame.js         the scanner's casing: gauges, pause / recalibrate keys, fire button
js/hud.js, indicators.js, screens.js, fx.js
js/audio/sfx.js     synthesised effects
js/audio/music.js   sequencer and pattern data
js/storage.js       local high scores and settings
```

## Tuning on a real phone

These can only be judged with the phone in your hand:

- `FOV_LONG` in `js/config.js`: if rifts swim against the room as you turn, the value does
  not match your camera.
- Difficulty: rift timings are in `js/incidents.js`, damage and speed in each creature file.
- Music: patterns are note data at the top of `js/audio/music.js`.
