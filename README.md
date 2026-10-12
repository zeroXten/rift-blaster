# Rift Blaster

A browser AR shooter for phones. The rear camera shows your room, rifts tear open in the space
around you in 360°, and creatures from other dimensions arrive through them. Hold the phone
sideways in both hands and turn to aim. FIRE and SEAL are under your right thumb: shoot what
comes out of a rift until it weakens, then hold SEAL on it to close it. Power-ups you collect
are on buttons under your left thumb. Levels run straight into one another and keep getting
harder.

There are two ways to lose. **Health** is you: creatures that reach you take it, and the
scanner's screen cracks as it goes. **Reality** is the room: every rift left open wears it
down, fractures appear in the space around you, and sealing rifts mends it.

Plain HTML, CSS and JavaScript modules: no build step, no libraries, no backend, no asset files.
Sprites, font, sound effects and music are all generated in code. See [SPEC.md](SPEC.md).

## Play

Camera and motion sensors need HTTPS, so play it from GitHub Pages (Settings → Pages → deploy
from the `main` branch root) on iPhone Safari or Android Chrome. It plays in landscape only: on
an iPhone, rotation lock has to be off; on Android, starting a run goes full screen and turns
the screen for you.

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
| Hold the SEAL button, E, or the right mouse button | Seal the rift under the crosshair |
| The buttons on the left grip, or 1–5 | Use a power-up |
| P / Esc | Pause |
| F, or the key on the left of the casing | Full screen, in and out |
| R | Recalibrate |
| 1–9 on the title screen, or `?level=N` | Start at that level |

In desktop mode `window.riftDebug` is available in the console: `riftDebug.start(level)`,
`riftDebug.look(yaw, pitch)` in degrees, `riftDebug.step(seconds)` to advance the simulation,
`riftDebug.game` and `riftDebug.run`.

## Layout

```
index.html, css/style.css
js/main.js          bootstrap, input, state machine
js/config.js        tunable constants (field of view, heat, seal time, ...)
js/levels.js        what each level contains, and per-dimension spawn rules (data)
js/scanner.js       every scanner line (data) and speech
js/orientation.js   sensor -> quaternion, smoothing, recalibrate, debug look
js/projection.js    bearing -> screen position
js/render.js        low-resolution canvas, camera palette reduction, pixel primitives
js/sprites.js       sprite grids and palettes
js/font.js          pixel font
js/rift.js          rift stages, spawning, sealing, and the rift art for each dimension
js/creatures/       yrrk, zik, glomm, brakk, skaith, fael, ootheen, thrum, ummagog
js/pickups.js       power-ups dropped by creatures
js/weapon.js        aiming, heat, firing and sealing
js/game.js          one level in play
js/frame.js         the scanner's casing: gauges, system keys, power-up buttons, SEAL and FIRE
js/fractures.js     the room coming apart as reality falls
js/hud.js, indicators.js, screens.js, fx.js
js/audio/sfx.js     synthesised effects
js/audio/music.js   sequencer and pattern data
js/storage.js       local high scores and settings
```

## Tuning on a real phone

These can only be judged with the phone in your hand:

- `FOV_LONG` in `js/config.js`: if rifts swim against the room as you turn, the value does
  not match your camera.
- Reality: how fast open rifts and crowds wear it down is `STRAIN` and its neighbours in
  `js/config.js`.
- Difficulty: how each level gets harder than the last is `setLevel` at the bottom of
  `js/config.js`, and the easy / medium / hard picker is the table of multipliers above it
  (easy is meant for small children: its `arc` keeps everything within 35° of straight
  ahead, so there is no turning around). What a level contains is `levelDef` in `js/levels.js`;
  damage and speed are in each creature file.
- Variety: which creatures each dimension sends, and how often, is the `spawns` list in
  `js/levels.js`; power-up types, the level each one first appears on, how long they last and how often they
  drop are at the top of `js/pickups.js`.
- Music: patterns are note data at the top of `js/audio/music.js`.
