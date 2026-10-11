// Bootstrap, the frame loop, input, and the state machine. Landscape, held in both hands:
// title -> (help) -> briefing -> play <-> paused -> report -> upgrade -> briefing ... -> victory
//                                          `-> gameover

import { FOV_LONG, UI } from './config.js';
import { R, initRender } from './render.js';
import { DEG, qAxis, setView, view } from './projection.js';
import {
  debugAim, debugLook, orient, recalibrate, requestMotionPermission, startDebug, startSensor,
  updateOrientation, waitForData,
} from './orientation.js';
import { camera, resumeCamera, startCamera } from './video.js';
import { audio, initAudio, play, sealTone } from './audio/sfx.js';
import { music, setMusicMode } from './audio/music.js';
import { GRADES, LINES, scanner } from './scanner.js';
import { INCIDENTS } from './incidents.js';
import { Game } from './game.js';
import { frameHit } from './frame.js';
import { drawScreen } from './screens.js';
import { drawTextS } from './font.js';
import { loadStore, recordScore, saveStore } from './storage.js';
import { pick } from './util.js';

const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)');
// Desktop mode: mouse-drag to look, automatic without a touch screen. It uses the webcam if one
// is offered; ?debug is the plain debug mode with no camera and a lattice backdrop.
const PLAIN = params.has('debug');
const DEBUG = PLAIN || !coarse.matches;
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const canvas = document.getElementById('game');
initRender(canvas);

const store = loadStore();
music.enabled = store.music;
scanner.voice = store.voice;

const ui = { state: 'title', t: 0, since: 0, buttons: [], help: null, report: null, starting: false };
let run = newRun();
let game = null;
let drag = null;
let last = performance.now();
let fps = 60;

function newRun() {
  const start = Math.min(INCIDENTS.length, Math.max(1, parseInt(params.get('incident'), 10) || 1)) - 1;
  return { id: Date.now(), incident: start, upgrades: { cool: 0, beam: 0, seal: 0 }, score: 0, grades: [] };
}

function setState(state) {
  ui.state = state;
  ui.t = 0;
  ui.since = performance.now();
  if (state !== 'play') { sealTone(0); scanner.clear(); }
  setMusicMode(state === 'play' ? 'play' : state === 'paused' ? 'off' : 'menu');
  if (state === 'briefing') scanner.speak(INCIDENTS[run.incident].briefing.join(' '));
}

// --- Start tap: motion permission, then camera, then audio is already running ---------------

async function start() {
  if (ui.starting) return;
  if (orient.mode !== 'none') return begin();
  ui.starting = true;
  // iOS only grants motion access from inside this tap, and only if it is asked for before the
  // camera: otherwise the camera prompt consumes the tap and motion is silently denied.
  const motionAsked = DEBUG ? null : requestMotionPermission();
  initAudio();
  scanner.unlock();
  keepAwake();

  if (DEBUG) {
    startDebug();
    // No help screen here: without a webcam, or with it refused, the lattice backdrop stands in.
    if (!PLAIN) await startCamera().catch(() => {});
  } else {
    const motion = await motionAsked;
    if (motion === 'granted') startSensor();
    let camError = null;
    try { await startCamera(); } catch (e) { camError = e; }
    const moving = motion === 'granted' && await waitForData(1500);
    if (!moving || camError) {
      ui.help = {
        ios: IOS,
        motion: moving ? null : motion === 'denied' ? 'denied' : 'missing',
        camera: !camError ? null : camError.name === 'InsecureContext' ? 'insecure' : 'denied',
      };
      ui.starting = false;
      return setState('help');
    }
  }
  ui.starting = false;
  begin();
}

function begin() {
  run = newRun();
  game = null;
  setState('briefing');
}

function startIncident() {
  scanner.hush();
  goLandscape();
  game = new Game(INCIDENTS[run.incident], run.upgrades);
  setState('play');
}

// Where the browser allows it (Android), fill the screen and hold it in landscape, which also
// works for a phone with rotation locked. Needs a tap. iPhones have no such API.
function goLandscape() {
  if (!coarse.matches) return;
  const el = document.documentElement;
  Promise.resolve(el.requestFullscreen?.()).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}

function keepAwake() {
  navigator.wakeLock?.request('screen').catch(() => {});
}

// --- Incident results ------------------------------------------------------------------------

function finish(result) {
  const s = game.stats, acc = s.shots ? s.hits / s.shots : 0;
  if (result === 'lost') {
    ui.report = { comment: pick(LINES.gameover) };
    recordScore(store, run);
    setState('gameover');
  } else {
    // The scanner's performance review: mostly how much reality is left, partly how well the player shot.
    const mark = game.integrity * 0.6 + acc * 40;
    const grade = mark >= 90 ? 'S' : mark >= 78 ? 'A' : mark >= 62 ? 'B' : mark >= 45 ? 'C' : 'D';
    const score = s.kills * 25 + s.sealed * 150 + Math.round(game.integrity) * 10 + Math.round(acc * 500);
    run.score += score;
    run.grades.push(grade);
    ui.report = {
      kills: s.kills, sealed: s.sealed, total: game.total,
      integrity: Math.round(game.integrity), acc: Math.round(acc * 100),
      score, grade, comment: pick(GRADES[grade]),
    };
    recordScore(store, run);
    setState('report');
  }
  scanner.speak(ui.report.comment);
}

function pause() {
  if (ui.state !== 'play') return;
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
    case 'begin':
    case 'retry': startIncident(); break;
    case 'continue':
      scanner.hush();
      if (run.incident === INCIDENTS.length - 1) { setState('victory'); scanner.speak(LINES.victory[0]); }
      else setState('upgrade');
      break;
    case 'up_cool':
    case 'up_beam':
    case 'up_seal':
      run.upgrades[id.slice(3)]++;
      run.incident++;
      setState('briefing');
      break;
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
  }
}

// --- Input -----------------------------------------------------------------------------------

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * R.w) / r.width, y: ((e.clientY - r.top) * R.h) / r.height };
}

const inside = (b, p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

// In play, the right grip is the fire button and a touch on the screen fires too. With
// drag-to-look, a press on the screen that does not move fires on release; each finger is
// tracked separately so one can look while the other thumb fires.
canvas.addEventListener('pointerdown', e => {
  if (ui.state !== 'play') return;
  const hit = frameHit(toCanvas(e));
  if (hit === 'fire') game.fire();
  else if (hit === 'pause') { play('ui'); pause(); }
  else if (hit === 'recal') { play('ui'); doRecalibrate(); }
  else if (hit) return;
  else if (orient.mode === 'debug') drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  else game.fire();
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
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.moved < 6 && ui.state === 'play') game.fire();
  drag = null;
});
window.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) drag = null; });

// Menus use click, which is the event iOS accepts as a user gesture for permissions and audio.
canvas.addEventListener('click', e => {
  if (ui.state === 'play' || performance.now() - ui.since < 300) return;
  const p = toCanvas(e), b = ui.buttons.find(b => inside(b, p));
  if (b) { play('ui'); act(b.id); }
  else if (ui.state === 'briefing') ui.t += 100;
});

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' && ui.state === 'play') { game.fire(); e.preventDefault(); }
  else if (e.code === 'KeyP' || e.code === 'Escape') ui.state === 'paused' ? setState('play') : pause();
  else if (e.code === 'KeyR' && ui.state === 'play') doRecalibrate();
  else if (e.code === 'Enter' && ui.state !== 'play') {
    const b = ui.buttons.find(b => b.primary);
    if (b) act(b.id);
  } else if (DEBUG && ui.state === 'title' && /^Digit[1-5]$/.test(e.code)) {
    params.set('incident', e.code.slice(5));
    start();
  }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  else { resumeCamera(); audio.ctx?.resume?.(); keepAwake(); }
});
// Landscape only: a CSS overlay covers the game in portrait, so stop the clock too. Tapping
// the overlay turns the screen for the player where the browser can.
matchMedia('(orientation: portrait)').addEventListener?.('change', e => { if (e.matches && coarse.matches) pause(); });
document.getElementById('rotate').addEventListener('click', goLandscape);

// --- Frame loop ------------------------------------------------------------------------------

function tick(dt) {
  ui.t += dt;
  updateOrientation(dt);
  // Before the sensors are running, the title drifts slowly on its own.
  setView(orient.mode === 'none' ? qAxis(0, 1, 0, performance.now() * -0.00004) : orient.q, R.view, FOV_LONG);
  scanner.update(dt);

  if (ui.state === 'play') {
    ui.buttons = [];
    game.update(dt);
    game.draw();
    if (DEBUG) {
      const yaw = Math.round(((view.yaw / DEG) + 360) % 360), pitch = Math.round(view.pitch / DEG);
      drawTextS(`YAW ${yaw} PITCH ${pitch} FPS ${Math.round(fps)}`, view.cx, R.view.y + 6, UI.mid, 1, 0.5);
    }
    if (game.result) finish(game.result);
  } else {
    if (ui.state === 'paused') game.draw();
    ui.buttons = drawScreen(ui.state, { t: ui.t, run, store, help: ui.help, report: ui.report, starting: ui.starting, debug: DEBUG });
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps += (1 / Math.max(dt, 0.001) - fps) * 0.05;
  tick(dt);
}

// Console handle for development: riftDebug.look(90, 0), riftDebug.step(5), riftDebug.game.
if (DEBUG) {
  window.riftDebug = {
    get game() { return game; },
    get state() { return ui.state; },
    look: debugAim,
    step(seconds = 1) { for (let t = 0; t < seconds; t += 1 / 60) tick(1 / 60); },
  };
}

requestAnimationFrame(frame);
