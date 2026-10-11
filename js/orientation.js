// Device orientation -> camera quaternion. Rotation only (3DoF), yaw relative to the last recalibrate.
// Falls back to a drag / arrow-key look for desktop debugging.

import { DEG, qAxis, qMul, qRotate, qSlerp } from './projection.js';
import { SMOOTHING } from './config.js';
import { clamp } from './util.js';

export const orient = { q: [0, 0, 0, 1], mode: 'none', hasData: false };

// The sensor frame has the camera looking out of the top of the phone; this tips it to look out of the back.
const Q_SCREEN = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];
const pose = [0, 0, 0, 1];

// How far the page is rotated from the phone's natural portrait: 90 or -90 in landscape.
function screenAngle() {
  return (typeof window.orientation === 'number' ? window.orientation : screen.orientation?.angle || 0) * DEG;
}
const raw = [0, 0, 0, 1], target = [0, 0, 0, 1], tmp = [0, 0, 0];
let yawZero = 0, snap = true;

const dbg = { yaw: 0, pitch: 0, keys: new Set() };

function onOrientation(e) {
  if (e.alpha == null || e.beta == null || e.gamma == null) return;
  // Euler angles in YXZ order (beta, alpha, -gamma), as the W3C spec defines them.
  const x = e.beta * DEG / 2, y = e.alpha * DEG / 2, z = -e.gamma * DEG / 2;
  const c1 = Math.cos(x), c2 = Math.cos(y), c3 = Math.cos(z);
  const s1 = Math.sin(x), s2 = Math.sin(y), s3 = Math.sin(z);
  qMul([
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 - s1 * s2 * c3,
    c1 * c2 * c3 + s1 * s2 * s3,
  ], Q_SCREEN, pose);
  // The readings are relative to the phone, not the page, so undo the page's rotation.
  qMul(pose, qAxis(0, 0, 1, -screenAngle()), raw);
  orient.hasData = true;
}

// iOS only grants this from inside a tap handler, and before any camera prompt.
export function requestMotionPermission() {
  const D = window.DeviceOrientationEvent;
  if (!D) return Promise.resolve('unsupported');
  if (typeof D.requestPermission === 'function') return D.requestPermission().catch(() => 'denied');
  return Promise.resolve('granted');
}

export function startSensor() {
  if (orient.mode === 'sensor') return;
  window.addEventListener('deviceorientation', onOrientation);
  orient.mode = 'sensor';
  snap = true;
}

export function waitForData(ms) {
  return new Promise(resolve => {
    const t0 = performance.now();
    (function poll() {
      if (orient.hasData) resolve(true);
      else if (performance.now() - t0 > ms) resolve(false);
      else setTimeout(poll, 50);
    })();
  });
}

export function startDebug() {
  if (orient.mode === 'debug') return;
  orient.mode = 'debug';
  window.addEventListener('keydown', e => dbg.keys.add(e.code));
  window.addEventListener('keyup', e => dbg.keys.delete(e.code));
  window.addEventListener('blur', () => dbg.keys.clear());
}

export function debugLook(dyaw, dpitch) {
  dbg.yaw += dyaw;
  dbg.pitch = clamp(dbg.pitch + dpitch, -85 * DEG, 85 * DEG);
}

// Point the debug camera at an absolute bearing, in degrees.
export function debugAim(yaw, pitch = 0) {
  dbg.yaw = yaw * DEG;
  dbg.pitch = clamp(pitch, -85, 85) * DEG;
}

function heading(q) {
  qRotate(q, [0, 0, -1], tmp);
  if (Math.hypot(tmp[0], tmp[2]) > 0.15) return Math.atan2(tmp[0], -tmp[2]);
  // Pointing at the floor or ceiling: take the heading from the top edge of the phone instead.
  const up = tmp[1] > 0 ? -1 : 1;
  qRotate(q, [0, 1, 0], tmp);
  return Math.atan2(tmp[0] * up, -tmp[2] * up);
}

// Makes whatever the player is facing now yaw 0.
export function recalibrate() {
  if (orient.mode === 'sensor') { yawZero = heading(raw); snap = true; }
  else dbg.yaw = 0;
}

export function updateOrientation(dt) {
  if (orient.mode === 'sensor') {
    if (!orient.hasData) return;
    qMul(qAxis(0, 1, 0, yawZero), raw, target);
    if (snap) { orient.q = target.slice(); snap = false; }
    else qSlerp(orient.q, target, 1 - Math.exp(-SMOOTHING * dt), orient.q);
  } else if (orient.mode === 'debug') {
    const k = dbg.keys, v = 90 * DEG * dt;
    if (k.has('ArrowLeft') || k.has('KeyA')) debugLook(-v, 0);
    if (k.has('ArrowRight') || k.has('KeyD')) debugLook(v, 0);
    if (k.has('ArrowUp') || k.has('KeyW')) debugLook(0, v);
    if (k.has('ArrowDown') || k.has('KeyS')) debugLook(0, -v);
    qMul(qAxis(0, 1, 0, -dbg.yaw), qAxis(1, 0, 0, dbg.pitch), orient.q);
  }
}
