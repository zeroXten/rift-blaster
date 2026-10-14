// Bootstrap, the frame loop, input, and the state machine. Landscape, held in both hands:
// title (<-> guide) -> (help) -> play <-> paused -> gameover
// Play is one continuous run: the moment a level's last rift is sealed the next level's rifts
// start opening, marked only by its number flashing at the top of the screen, and every level
// is harder than the one before.

import { DIFFICULTY, FOV_LONG, UI, level, setDifficulty, setLevel } from './config.js';
import { R, initRender, px } from './render.js';
import { DEG, qAxis, setView, view } from './projection.js';
import {
  debugAim, debugLook, orient, recalibrate, requestMotionPermission, startDebug, startSensor,
  updateOrientation, waitForData,
} from './orientation.js';
import { camera, resumeCamera, startCamera } from './video.js';
import { audio, initAudio, play, sealTone } from './audio/sfx.js';
import { music, setMusicMode } from './audio/music.js';
import { LINES, scanner } from './scanner.js';
import { levelDef } from './levels.js';
import { Game } from './game.js';
import { frameHit } from './frame.js';
import { enterFullscreen, exitFullscreen, fullscreen } from './fullscreen.js';
import { POWERUPS } from './pickups.js';
import { GUIDE_LENGTH, drawLevelFlash, drawScreen } from './screens.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { loadStore, recordScore, saveStore } from './storage.js';
import { pick } from './util.js';

const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)');
// Desktop mode: mouse-drag to look, automatic without a touch screen. It uses the webcam if one
// is offered; ?debug is the plain debug mode with no camera and a lattice backdrop.
const PLAIN = params.has('debug');
const DEBUG = PLAIN || !coarse.matches;
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const KINDS = Object.keys(POWERUPS);
const FLASH_TIME = 1.8;       // seconds a new level's number flashes for

const canvas = document.getElementById('game');
initRender(canvas);

const store = loadStore();
music.enabled = store.music;
scanner.voice = store.voice;
setDifficulty(store.difficulty);

const ui = { state: 'title', t: 0, since: 0, buttons: [], help: null, over: null, starting: false, flash: 0, page: 0 };
let run = null;
let game = null;
let drag = null;
let firePointer = null;       // the finger holding FIRE, for rapid fire
let sealPointer = null;       // the finger holding SEAL
let autoFull = true;          // go full screen when a run starts, until the player leaves it
let toast = null;
// The hidden override: five quick taps on the version number on the title screen switch it on
// or off. While it is on nothing hurts, reality holds, and every power-up is always to hand.
let god = false;
const taps = { n: 0, at: 0 };
let last = performance.now();
let fps = 60;

// A run: one attempt at getting as far as possible. Power-ups held carry from level to level.
function newRun() {
  return {
    id: Date.now(),
    level: Math.max(1, parseInt(params.get('level'), 10) || 1),
    score: 0, kills: 0, checkpoint: 0,
    inv: Object.fromEntries(KINDS.map(k => [k, 0])),
  };
}

function setState(state) {
  ui.state = state;
  ui.t = 0;
  ui.since = performance.now();
  if (state !== 'play') { sealTone(0); scanner.clear(); }
  setMusicMode(state === 'play' ? 'play' : state === 'paused' ? 'off' : 'menu');
}

// --- Start tap: motion permission, then camera, then audio is already running ---------------

async function start() {
  if (ui.starting) return;
  if (orient.mode !== 'none') return begin();
  ui.starting = true;
  // iOS only grants motion access from inside this tap, and only if it is asked for before the
  // camera: otherwise the camera prompt consumes the tap and motion is silently denied.
  const motionAsked = DEBUG ? null : requestMotionPermission();
  let problem = null;
  try {
    initAudio();
    scanner.unlock();
    keepAwake();
    if (DEBUG) {
      startDebug();
      // Not waited for: the webcam feed appears if and when it is allowed, and the lattice
      // backdrop stands in until then.
      if (!PLAIN) startCamera().catch(() => {});
    } else {
      const motion = await motionAsked;
      if (motion === 'granted') startSensor();
      // Neither wait is open-ended: an unanswered prompt or a silent sensor ends up on the
      // help screen, which carries on by itself if the answer arrives late.
      let camError = null;
      try { await startCamera(20000); } catch (e) { camError = e; }
      // The first reading can take a few seconds to arrive, most of all straight after the
      // camera has started, so be patient before deciding there is no sensor.
      const moving = motion === 'granted' && await waitForData(4000);
      if (!moving || camError) {
        problem = {
          ios: IOS,
          motion: moving ? null : motion === 'denied' ? 'denied' : 'missing',
          camera: !camError ? null : camError.name === 'InsecureContext' ? 'insecure' : 'denied',
        };
      }
    }
  } catch (e) {
    // Whatever went wrong, do not leave the title screen stuck on "stand by".
    console.error(e);
    if (!DEBUG) problem = { ios: IOS, motion: orient.hasData ? null : 'missing', camera: camera.ready ? null : 'denied' };
  }
  ui.starting = false;
  if (problem && (problem.motion || problem.camera)) { ui.help = problem; setState('help'); }
  else begin();
}

function begin() {
  // Asked for here, once the permission prompts are out of the way, so they cannot knock it
  // back out of full screen. If the tap has gone stale by now, the casing's key still works.
  goLandscape();
  run = newRun();
  scanner.reset();
  startLevel();
}

// Starts a run, or another attempt at the level it was lost on, with everything restored.
function startLevel() {
  setLevel(run.level);
  game = new Game(levelDef(run.level), { inv: run.inv, god });
  ui.flash = FLASH_TIME;
  firePointer = sealPointer = null;
  setState('play');
}

// The level's last rift has been sealed: score it and carry straight on into the next one.
function nextLevel() {
  const s = game.stats;
  run.kills += s.kills;
  run.score += Math.round((s.kills * 25 + s.sealed * 150 + Math.round(game.health + game.reality) * 3) * level.score);
  run.checkpoint = run.score;
  run.level++;
  if (!god) recordScore(store, run);
  setLevel(run.level);
  game.advance(levelDef(run.level));
  ui.flash = FLASH_TIME;
  // Say so when this level adds a power-up to what can drop.
  const fresh = KINDS.filter(k => POWERUPS[k].from === run.level).map(k => POWERUPS[k].name.toLowerCase());
  if (fresh.length) scanner.show(`New power-up: ${fresh.join(' and ')}.`, true);
}

// On a phone, starting fills the screen and holds it in landscape where the browser allows
// it. Once the player has left full screen themselves, it stays their choice.
function goLandscape() {
  if (coarse.matches && autoFull) enterFullscreen(true);
}

// The full-screen key on the casing, or F.
function toggleFullscreen() {
  if (fullscreen.on) { autoFull = false; exitFullscreen(); }
  else if (fullscreen.supported) { autoFull = true; enterFullscreen(coarse.matches); }
  else if (fullscreen.standalone) say('Already full screen.');
  else say(IOS ? 'iPhone: tap Share, then Add to Home Screen. Opened from there, it runs full screen.' : 'This browser has no full screen mode.');
}

function say(text) {
  toast = { text, ttl: 5 };
}

function keepAwake() {
  navigator.wakeLock?.request('screen').catch(() => {});
}

// --- The end of a run ------------------------------------------------------------------------

function gameOver() {
  run.kills += game.stats.kills;
  if (!god) recordScore(store, run);
  const cause = game.cause || 'health';
  ui.over = { level: run.level, score: run.score, kills: run.kills, cause, comment: pick(LINES[cause === 'reality' ? 'collapsed' : 'gameover']) };
  setState('gameover');
  scanner.speak(ui.over.comment);
}

function pause() {
  if (ui.state !== 'play') return;
  release();
  scanner.hush();
  setState('paused');
}

function doRecalibrate() {
  recalibrate();
  play('recal');
  scanner.say('recal', true);
}

function act(id) {
  switch (id) {
    case 'start': start(); break;
    case 'guide': ui.page = 0; setState('guide'); break;
    case 'guide_next': ui.page = (ui.page + 1) % GUIDE_LENGTH; break;
    case 'version': {
      const now = performance.now();
      taps.n = now - taps.at < 1200 ? taps.n + 1 : 1;
      taps.at = now;
      if (taps.n >= 5) {
        taps.n = 0;
        god = !god;
        play('pickup');
        say(god ? 'Override accepted. Nothing can hurt you.' : 'Override off.');
      }
      break;
    }
    // Another go at the level that was lost, with the score as it stood when that level began.
    case 'retry': run.score = run.checkpoint; startLevel(); break;
    case 'resume': setState('play'); break;
    case 'recal': doRecalibrate(); if (ui.state === 'paused') setState('play'); break;
    case 'music': store.music = music.enabled = !store.music; saveStore(store); break;
    case 'voice':
      store.voice = scanner.voice = !store.voice;
      if (!store.voice) scanner.hush();
      saveStore(store);
      break;
    case 'title': game = null; scanner.hush(); setState('title'); break;
    case 'reload': location.reload(); break;
    // Fallbacks from the permissions help screen.
    case 'drag': startDebug(); begin(); break;
    case 'nocam': begin(); break;
    default:
      if (!DIFFICULTY[id]) break;
      setDifficulty(id);
      store.difficulty = id;
      saveStore(store);
  }
}

// --- Input -----------------------------------------------------------------------------------

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * R.w) / r.width, y: ((e.clientY - r.top) * R.h) / r.height };
}

const inside = (b, p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

// FIRE shoots once, and counts as held until it is let go, which is what rapid fire uses.
function pullTrigger(id) {
  firePointer = id;
  game.trigger = true;
  game.fire();
}

// SEAL only does anything while it is held.
function holdSeal(id) {
  if (level.auto) return;      // rifts close themselves on this setting
  sealPointer = id;
  game.sealing = true;
}

// Lets go of whichever buttons that finger (or key) was holding; with no id, of everything.
function release(id) {
  if (id === undefined || id === firePointer) { firePointer = null; if (game) game.trigger = false; }
  if (id === undefined || id === sealPointer) { sealPointer = null; if (game) game.sealing = false; }
}

// In play the right grip is SEAL and FIRE, the left grip has the power-ups, and a touch on the
// screen fires too. With drag-to-look, a press on the screen that does not move fires on
// release, and the right mouse button is SEAL. Each finger is tracked separately so one can
// look or hold SEAL while the other does something else.
canvas.addEventListener('pointerdown', e => {
  if (ui.state !== 'play') return;
  const hit = frameHit(toCanvas(e));
  if (hit === 'full') return;      // handled on click, below
  if (hit === 'fire') pullTrigger(e.pointerId);
  else if (hit === 'seal') holdSeal(e.pointerId);
  else if (hit === 'pause') { play('ui'); pause(); }
  else if (hit === 'recal') { play('ui'); doRecalibrate(); }
  else if (hit?.startsWith('slot:')) game.use(hit.slice(5));
  else if (hit) return;
  else if (e.button === 2) holdSeal(e.pointerId);
  else if (orient.mode === 'debug') drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  else pullTrigger(e.pointerId);
});

window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  // Grab-and-drag: the scene follows the pointer exactly.
  const k = 1 / (view.f * R.css);
  debugLook(-dx * k, dy * k);
});

window.addEventListener('pointerup', e => {
  release(e.pointerId);
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.moved < 6 && ui.state === 'play') game.fire();
  drag = null;
});
window.addEventListener('pointercancel', e => {
  release(e.pointerId);
  if (drag && e.pointerId === drag.id) drag = null;
});

// Menus use click, which is the event iOS accepts as a user gesture for permissions and audio.
canvas.addEventListener('click', e => {
  const p = toCanvas(e);
  if (frameHit(p) === 'full') { play('ui'); toggleFullscreen(); return; }
  if (ui.state === 'play' || performance.now() - ui.since < 300) return;
  const b = ui.buttons.find(b => inside(b, p));
  if (b) { if (!b.quiet) play('ui'); act(b.id); }
});

// Keyboard: Space fires, E seals, 1-5 use the power-ups in the order of their buttons.
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  const digit = /^Digit[1-9]$/.test(e.code) ? +e.code.slice(5) : 0;
  if (ui.state === 'play') {
    if (e.code === 'Space') { pullTrigger('space'); e.preventDefault(); }
    else if (e.code === 'KeyE') holdSeal('seal-key');
    else if (e.code === 'KeyR') doRecalibrate();
    else if (digit && digit <= KINDS.length) game.use(KINDS[digit - 1]);
  } else if (e.code === 'Enter') {
    const b = ui.buttons.find(b => b.primary);
    if (b) act(b.id);
  } else if (DEBUG && ui.state === 'title' && digit) {
    // Development: start at a given level.
    params.set('level', digit);
    start();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') ui.state === 'paused' ? setState('play') : pause();
  else if (e.code === 'KeyF') toggleFullscreen();
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') release('space');
  else if (e.code === 'KeyE') release('seal-key');
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  else { resumeCamera(); audio.ctx?.resume?.(); keepAwake(); }
});
// Landscape only: a CSS overlay covers the game in portrait, so stop the clock too. Tapping
// the overlay turns the screen for the player where the browser can.
matchMedia('(orientation: portrait)').addEventListener?.('change', e => { if (e.matches && coarse.matches) pause(); });
document.getElementById('rotate').addEventListener('click', () => enterFullscreen(true));
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(type, () => { if (!fullscreen.on) autoFull = false; });
}

// --- Frame loop ------------------------------------------------------------------------------

function tick(dt) {
  ui.t += dt;
  updateOrientation(dt);
  // Before the sensors are running, the title drifts slowly on its own.
  setView(orient.mode === 'none' ? qAxis(0, 1, 0, performance.now() * -0.00004) : orient.q, R.view, FOV_LONG);
  scanner.update(dt);

  // If the sensor or the camera was only slow to answer, carry on from the help screen
  // without being asked.
  if (ui.state === 'help') {
    const h = ui.help;
    if (h.motion === 'missing' && orient.mode === 'sensor' && orient.hasData) h.motion = null;
    if (h.camera === 'denied' && camera.ready) h.camera = null;
    if (!h.motion && !h.camera) begin();
  }

  if (ui.state === 'play') {
    ui.buttons = [];
    game.update(dt);
    game.draw();
    if ((ui.flash -= dt) > 0) drawLevelFlash(run.level, ui.flash / FLASH_TIME);
    if (DEBUG) {
      const yaw = Math.round(((view.yaw / DEG) + 360) % 360), pitch = Math.round(view.pitch / DEG);
      drawTextS(`YAW ${yaw} PITCH ${pitch} FPS ${Math.round(fps)}`, R.view.x + R.view.w - 6, R.view.y + 6, UI.dim, 1, 1);
    }
    if (game.cleared) nextLevel();
    else if (game.result) gameOver();
  } else {
    if (ui.state === 'paused') game.draw();
    ui.buttons = drawScreen(ui.state, { t: ui.t, store, help: ui.help, over: ui.over, starting: ui.starting, page: ui.page, god, debug: DEBUG });
  }

  // A short notice along the bottom of the screen, on whatever is showing.
  if (toast && (toast.ttl -= dt) > 0) {
    const v = R.view, lines = wrapText(toast.text, ((v.w - 24) / 6) | 0), y = v.y + v.h - 6 - lines.length * 9;
    px(v.x + 6, y - 3, v.w - 12, lines.length * 9 + 4, UI.k);
    lines.forEach((l, i) => drawText(l, view.cx, y + i * 9, UI.yel, 1, 0.5));
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps += (1 / Math.max(dt, 0.001) - fps) * 0.05;
  tick(dt);
}

// Console handle for development: riftDebug.start(3), riftDebug.look(90, 0), riftDebug.step(5),
// riftDebug.game, riftDebug.run.
if (DEBUG) {
  window.riftDebug = {
    get game() { return game; },
    get run() { return run; },
    get state() { return ui.state; },
    look: debugAim,
    start(n = 1) { startDebug(); params.set('level', n); begin(); },
    step(seconds = 1) { for (let t = 0; t < seconds; t += 1 / 60) tick(1 / 60); },
  };
}

requestAnimationFrame(frame);
