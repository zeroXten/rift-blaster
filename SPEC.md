# RIFT CONTROL — Game Spec

*Working title. Creature and dimension names are placeholders too.*

A browser-based AR shooter for phones. The rear camera shows the player's real room; rifts tear open in the space around them in 360°, and things from other dimensions push through. The player physically turns, aims and shoots, guided by a scanner with opinions.

Plain HTML, CSS and JavaScript. No build step, no libraries, no backend, no asset files. Deployable as-is on GitHub Pages.

---

## 1. Premise

Rifts between dimensions are opening wherever the player happens to be standing. Each rift leads to a different dimension, and each dimension has its own inhabitants. They are invisible to the naked eye.

The player holds a **Scanner** (the phone). It reveals rifts and creatures, shoots them, and seals rifts shut. It also talks.

There is no domestic or everyday-object angle: rifts appear at random points in space, not near furniture, and creatures have no interest in the player's belongings.

**Tone:** 90s PC sci-fi, played mostly straight, with the humour coming from the scanner.

---

## 2. The Scanner (narrator)

The scanner is the game's only character and is present the whole time: it is the gun, the HUD and the player's eyes.

**Personality:** calm, vastly overqualified, treats interdimensional horrors as routine and the player as the unreliable component. Indifferent to the player's safety, meticulous about the job. (Reference point: the ship in Rick and Morty.)

> "Breach at your six. That means behind you."
>
> "Something came through. I'd describe it, but you'd only worry."
>
> "I am overheating. I did mention the trigger discipline."

**Where its voice appears**

| Moment | How the scanner handles it |
|---|---|
| Permissions | "I need your camera. I can't see without it." |
| Briefing | Introduces the incident and any new creature, by catalogue name, with total confidence and little explanation |
| Mid-game | One-line remarks, rate-limited, never blocking play |
| Overheat | It refuses to fire |
| Recalibrate | It grudgingly admits it has lost track of the room |
| Report | Its performance review of the player, with a grade |

**Rules for mid-game lines:** one line at a time, a few words, shown near the bottom of the screen. Anything longer belongs between rounds.

**Speech:** the browser's built-in speech synthesis, which sounds robotic and so suits the character. Text first; speech in V1.

---

## 3. Core Loop

1. **Find**: rifts open at random bearings around the player (full 360° yaw, ±40° pitch). Off-screen rifts are signposted by edge arrows, with stereo panning as a secondary cue.
2. **Shoot**: creatures push through and approach. The player centres the crosshair and taps anywhere to fire.
3. **Seal**: hold the crosshair on a rift for **2 seconds** to seal it. A progress ring fills; looking away resets it.
4. **Survive**: an incident ends when all its rifts are sealed. It is lost if **Reality Integrity** hits 0%.

### The breach

Creatures breaking through is the centrepiece, not just a spawn event. Each rift moves through visible stages:

| Stage | What the player sees |
|---|---|
| **Crack** | A hairline fracture in the air. Nothing comes through yet. Cheapest moment to seal. |
| **Tear** | The rift opens; the membrane bulges and limbs push through before the creature emerges. |
| **Breach** | Fully open. Creatures come through faster, and tougher ones arrive. |

Shooting a creature while it is still emerging knocks it back and narrows the rift.

### Resources

| Resource | Behaviour |
|---|---|
| **Reality Integrity** | 100% at the start of each incident. Reduced by creatures that reach the player. |
| **Scanner Heat** | Each shot adds heat; heat decays over time. At 100% the scanner locks for 2s. |
| **Rift Width** | Unsealed rifts widen through the stages above. |

---

## 4. Creatures

Each creature comes from a different dimension. A dimension has its own rift colour, palette and sound, so the player can tell what is about to come through before it arrives. Creatures have no assigned "roles" in the fiction; they are simply different things that behave differently.

| Creature | Dimension / rift colour | Behaviour | HP | First seen |
|---|---|---|---|---|
| **Yrrk** | Vesh / acid green | Small, arrives in groups of 3–6, drifts toward the player | 1 | Incident 1 |
| **Glomm** | Ulta-9 / violet | Clings to the edge of its rift and pulls it wider until shot | 2 | Incident 2 |
| **Skaith** | The Hollow / cold white | Only moves when outside the player's view; freezes when seen | 3 | Incident 3 |
| **Ootheen** | Miridian / amber | A single eye. Jumps to a new position if kept in the crosshair for more than 0.8s | 1 | Incident 4 |
| **The Ummagog** | Unknown / red | Boss. Built from separate parts; three weak points shot in turn, then its rift sealed while it is stunned | 30 | Incident 5 |

### Incidents (5 for the full game)

1. **First Contact**: tutorial. One rift, Yrrks only.
2. **Widening**: several rifts; Glomms appear.
3. **Don't Look Away**: Skaiths. The player has to keep turning.
4. **It Sees You**: Ootheens, mixed with everything so far.
5. **The Big One**: a giant rift and the Ummagog.

---

## 5. Look

90s PC sci-fi pixel art, all generated in code.

- **One low-resolution canvas** (about 240 pixels wide, height to fit the screen), scaled up with hard pixel edges. Everything is drawn to it.
- **Camera feed** is drawn into the same canvas and reduced to a limited palette, so the room looks like it is being viewed through a 90s display. This is how the scanner sees.
- **Creatures** are flat sprites that scale as they approach, the way Doom drew monsters.
- **Sprites** are defined as small grids of palette colours in the source and turned into images at load. A strict shared palette, with a sub-palette per dimension.
- **Animation** comes mostly from code (bobbing, squashing, palette flashes) plus a few frames per creature.
- **The boss** is assembled from separately animated parts rather than one large drawing.
- **Rifts** are animated pixel effects with distinct art per breach stage.
- **Text** uses a pixel font, also defined in code.

### Effects
- Shot: a short beam from bottom-centre to the target, a flash, a burst of pixels.
- Creature death: squash, then break apart.
- Seal: the rift implodes.
- Damage: red flash and a brief glitch of the camera feed.
- Overheat: crosshair turns red, steam pixels.

---

## 6. Sound

All synthesised in the browser with the Web Audio API. No audio files.

- **Effects:** FM-style zaps, sweeps, noise bursts and warbles in the manner of a Sound Blaster. Distinct sounds per creature, per rift stage, and for hits, sealing and overheat.
- **Music:** a small tracker-style sequencer with a handful of synth voices (bass, arpeggio, lead, drums) playing patterns written as note data.
- **Reactive music:** layers are added or the tempo rises as rifts widen; each dimension has its own motif.
- **Panning:** music stays centred; rifts and creatures pan left and right by bearing. This is a secondary cue only, since phone speakers cannot convey front versus back.
- **Silent switch:** on iPhone, game audio is muted when the ringer switch is on silent. The title screen says so.
- Audio starts on the Start tap, as browsers require.

---

## 7. Tech Approach

### Hosting and structure
- Static files served by GitHub Pages, which provides the HTTPS that camera and motion sensors require.
- Plain JavaScript modules loaded directly by the browser. No build step and no dependencies.

### Camera
- `getUserMedia` with the rear camera (`facingMode: environment`), fed to a hidden `<video>` (`playsinline`, `muted`), and drawn into the game canvas each frame.

### Orientation
- Listen to `deviceorientation` and convert to a quaternion.
- **3DoF only:** the player's position is fixed; only rotation is tracked. Rifts and creatures live at bearings on a sphere around the player.
- **Projection:** rotate each object's direction by the inverse camera rotation and apply a perspective divide. This is the only 3D maths the game needs.
- **Smoothing:** slerp toward the sensor reading, time-based so it behaves the same at any frame rate.
- **Yaw is relative.** No compass. A Recalibrate button re-zeros yaw.
- **Field of view:** a tweakable constant, roughly 60–65° vertical in portrait. A mismatch with the real camera makes objects swim against the room.

### iOS permissions
- `DeviceOrientationEvent.requestPermission()` must be called from the Start tap, and **before** the camera request, or the camera prompt consumes the tap and motion is silently denied.
- Denied permissions show recovery instructions, not a blank screen.

### Aiming
- Crosshair fixed at screen centre; tap anywhere to fire.
- Hits are tested by angle between the view direction and the target, with generous tolerance because the player aims with their whole body.
- Sealing: accumulate progress while the rift is within about 6° of centre.

### Other
- Portrait only; a "rotate your phone" overlay in landscape.
- `navigator.vibrate()` on hit, damage and overheat (Android only).
- **Desktop debug mode:** no camera, a plain background, mouse-drag to look. Essential for development.
- Target 60fps on a mid-range phone, minimum 30fps. Cap of about 40 active creatures.

---

## 8. Screens

1. **Title**: logo, Start button (triggers motion, camera and audio), silent-switch note.
2. **Permissions help**: shown if camera or motion is denied.
3. **Briefing**: the scanner introduces the incident and any new creature.
4. **HUD**: crosshair with seal ring; Reality Integrity at the top; Scanner Heat at the bottom; edge arrows; scanner remarks; pause and recalibrate in a corner.
5. **Report**: creatures shot, rifts sealed, integrity left, accuracy, and the scanner's grade and comment.
6. **Game over**: "Reality Compromised", a scanner line, retry.

---

## 9. Build Order

### Step 0: tracking spike
The whole game depends on rifts feeling pinned to the room. Prove that first, on a real phone via GitHub Pages:
- [ ] Pixelated camera feed on the low-resolution canvas
- [ ] Motion tracking with the iOS permission flow and recalibrate
- [ ] One rift fixed in space
- [ ] Desktop debug mode with mouse look

### MVP
- [ ] Rifts with breach stages and seal-by-gaze
- [ ] Yrrk and Glomm
- [ ] Shooting, heat and integrity
- [ ] Edge arrows
- [ ] Core sound effects
- [ ] Scanner text lines
- [ ] Incidents 1–2 with briefing and report

### V1
- [ ] Skaith, Ootheen and the Ummagog; incidents 3–5
- [ ] Music, including reactive layers
- [ ] Scanner speech
- [ ] Upgrades between incidents: faster cooling, wider beam, quicker sealing
- [ ] Local high scores (`localStorage`, wrapped in try/catch)

### Stretch
- [ ] Endless mode

---

## 10. Acceptance Criteria (MVP)

- Loads from GitHub Pages on iPhone Safari and Android Chrome with the rear camera full-screen.
- Turning 360° keeps rifts visually fixed in the room, with drift under about 15° per minute.
- An off-screen rift can be found from the edge arrows alone.
- Incident 1 is completable in 2–3 minutes by a first-time player with only the briefing.
- 30fps or better on a three-year-old mid-range phone.
- Denied permissions show clear recovery instructions.
- The full loop works in desktop debug mode.

---

## 11. Known Risks

- **Tracking feel:** rotation-only tracking with an approximate field of view will swim slightly. Step 0 exists to find out how much.
- **Large sprites:** small creatures should look good; the boss is the hard one, hence building it from parts.
- **Music:** written without being heard by its author, so it needs rounds of listening feedback.
- **Physical play:** the player spins on the spot with a phone held up. Incidents stay short (2–3 minutes).

---

## 12. Suggested Structure

```
index.html
css/style.css
js/
  main.js            # bootstrap, state machine (title → briefing → play → report)
  video.js           # camera setup
  orientation.js     # sensor → quaternion, smoothing, recalibrate, debug mouse-look
  projection.js      # bearing → screen position
  render.js          # low-resolution canvas, camera palette reduction, sprite drawing
  sprites.js         # sprite grids and palettes
  font.js            # pixel font
  rift.js
  creatures/         # yrrk.js, glomm.js, skaith.js, ootheen.js, ummagog.js
  incidents.js       # incident definitions (data-driven)
  weapon.js          # aiming, heat
  audio/sfx.js
  audio/music.js     # sequencer and pattern data
  hud.js, screens.js, indicators.js
  scanner.js         # all scanner lines
```

Incident definitions and scanner lines stay data-driven so new incidents and creatures can be added without touching game logic.
