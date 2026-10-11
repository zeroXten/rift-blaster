// The scanner's casing: the border around the screen that makes the phone read as a device.
// Thin strips above and below the screen carry the gauges. The left grip has the system keys
// and one button per power-up; the right grip has SEAL and FIRE under the right thumb. It is
// drawn over the edges of the world, so anything that strays off the screen disappears behind it.

import { UI } from './config.js';
import { R, blit, box, disc, px, ring } from './render.js';
import { drawText } from './font.js';
import { fullscreen } from './fullscreen.js';
import { POWERUPS, powerIcon } from './pickups.js';

const CASE = '#1b2030', KEY = '#262c40', LIGHT = '#3a4460', DARK = '#0a0c14', GROOVE = '#141826';
const KINDS = Object.keys(POWERUPS);

// Where the controls are drawn.
function controls() {
  const v = R.view, x = v.x - 28, rx = v.x + v.w + 22;
  return {
    pause: { x, y: v.y + 3, w: 24, h: 15 },
    recal: { x, y: v.y + 20, w: 24, h: 15 },
    full: { x, y: v.y + 37, w: 24, h: 15 },
    slots: KINDS.map((kind, i) => ({ kind, x, y: v.y + 58 + i * 31, w: 24, h: 27 })),
    seal: { x: rx, y: Math.round(R.h * 0.27), r: 13 },
    fire: { x: rx, y: Math.round(R.h * 0.62), r: 17 },
  };
}

// Where the gauges sit in the top and bottom strips, shared with hud.js which fills them in.
export function gauges() {
  const v = R.view;
  return {
    reality: { x: v.x + 2, y: v.y - 11, bar: v.x + 46, barW: v.w - 138, right: v.x + v.w - 2 },
    heat: { x: v.x + 2, y: v.y + v.h + 3, bar: v.x + 30, barW: v.w - 32 },
  };
}

// What a touch at canvas point p lands on: 'fire', 'seal', 'pause', 'recal', 'full' (the
// full-screen key, which works on every screen), 'slot:<kind>' for a power-up button, 'case'
// (dead casing), or null for the screen itself. Touch targets are larger than the drawn
// controls: the whole right grip is SEAL above and FIRE below.
export function frameHit(p) {
  const v = R.view;
  if (p.x >= v.x + v.w) return p.y < R.h * 0.44 ? 'seal' : 'fire';
  if (p.x < v.x) {
    const y = p.y - v.y;
    if (y < 19) return 'pause';
    if (y < 36) return 'recal';
    if (y < 55) return 'full';
    const i = Math.floor((y - 56) / 31);
    return i >= 0 && i < KINDS.length ? 'slot:' + KINDS[i] : 'case';
  }
  return p.y < v.y || p.y >= v.y + v.h ? 'case' : null;
}

function keycap(b, edge) {
  px(b.x, b.y + 1, b.w, b.h, DARK);
  box(b.x, b.y, b.w, b.h - 1, KEY, edge);
}

// A round button, sunk a pixel while pressed.
function button(b, pressed, rim, body, top, label, ink) {
  const d = pressed ? 1 : 0;
  disc(b.x, b.y + 2, b.r + 3, DARK);
  disc(b.x, b.y + d, b.r, rim);
  disc(b.x - 1, b.y - 2 + d * 2, b.r - 3, pressed ? top : body);
  drawText(label, b.x + 1, b.y - 4 + d, ink, 1, 0.5);
}

// live: in play, so the controls are lit. pressed / sealing: FIRE / SEAL held. hot: overheated.
// led: status light colour. inv: power-ups held, by kind. active: power-ups in force, by kind.
export function drawFrame({ live = false, pressed = false, sealing = false, hot = false, led = UI.dim, inv = null, active = {} } = {}) {
  const { ctx, w, h, view: v } = R, vr = v.x + v.w, vb = v.y + v.h;
  const c = controls(), g = gauges(), blink = ((performance.now() / 160) | 0) & 1;

  // Body, with a lit top edge and a shadowed bottom edge.
  px(0, 0, w, v.y, CASE);
  px(0, vb, w, h - vb, CASE);
  px(0, v.y, v.x, v.h, CASE);
  px(vr, v.y, w - vr, v.h, CASE);
  px(0, 0, w, 1, LIGHT);
  px(0, h - 1, w, 1, DARK);

  // Grip ridges on the right, around the buttons.
  for (let y = v.y + 6; y < vb - 24; y += 3) {
    if (Math.abs(y - c.fire.y) > c.fire.r + 7 && Math.abs(y - c.seal.y) > c.seal.r + 7) px(vr + 7, y, w - vr - 12, 1, GROOVE);
  }
  for (const [x, y] of [[3, 3], [w - 6, 3], [3, h - 6], [w - 6, h - 6]]) {
    px(x, y, 3, 3, DARK);
    px(x, y, 1, 1, LIGHT);
  }

  // The screen sits in a recess with clipped corners.
  px(v.x - 2, v.y - 2, v.w + 4, 2, DARK);
  px(v.x - 2, v.y, 2, v.h, DARK);
  px(v.x - 2, vb, v.w + 4, 2, LIGHT);
  px(vr, v.y, 2, v.h + 2, LIGHT);
  for (let i = 0; i < 4; i++) {
    px(v.x, v.y + i, 4 - i, 1, DARK);
    px(vr - 4 + i, v.y + i, 4 - i, 1, DARK);
    px(v.x, vb - 1 - i, 4 - i, 1, DARK);
    px(vr - 4 + i, vb - 1 - i, 4 - i, 1, DARK);
  }

  // Gauge windows. hud.js draws the readings over these during play.
  drawText('REALITY', g.reality.x, g.reality.y, LIGHT);
  box(g.reality.bar, g.reality.y - 1, g.reality.barW, 9, UI.k, DARK);
  drawText('HEAT', g.heat.x, g.heat.y, LIGHT);
  box(g.heat.bar, g.heat.y - 1, g.heat.barW, 9, UI.k, DARK);

  // Left grip, top: pause, recalibrate, full screen.
  const ink = live ? UI.c : LIGHT;
  keycap(c.pause, live ? LIGHT : GROOVE);
  px(c.pause.x + 9, c.pause.y + 4, 2, 7, ink);
  px(c.pause.x + 13, c.pause.y + 4, 2, 7, ink);
  keycap(c.recal, live ? LIGHT : GROOVE);
  ring(c.recal.x + 12, c.recal.y + 8, 4, 0, 6.3, ink);
  px(c.recal.x + 12, c.recal.y + 2, 1, 4, ink);
  // Corner brackets: pointing out to go full screen, pointing in to leave it.
  keycap(c.full, LIGHT);
  const on = fullscreen.on || fullscreen.standalone, kx = c.full.x + 12, ky = c.full.y + 7;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = kx + sx * (on ? 2 : 6), y = ky + sy * (on ? 1 : 4), dx = on ? sx : -sx, dy = on ? sy : -sy;
      px(Math.min(x, x + dx * 2), y, 3, 1, UI.c);
      px(x, Math.min(y, y + dy * 2), 1, 3, UI.c);
    }
  }

  // Left grip, below: one button per power-up, showing how many are held. A button whose
  // power-up is in force has a lit edge.
  for (const s of c.slots) {
    const n = inv ? inv[s.kind] : 0, col = POWERUPS[s.kind].color;
    keycap(s, active[s.kind] ? (blink ? col : UI.w) : n ? col : GROOVE);
    ctx.globalAlpha = n ? 1 : 0.22;
    blit(powerIcon(s.kind), s.x + 12, s.y + 9, 2);
    ctx.globalAlpha = 1;
    if (n) drawText(n, s.x + 12, s.y + 18, UI.w, 1, 0.5);
  }

  // Right grip: SEAL above, FIRE below, and the status light.
  button(c.seal, sealing, live ? '#0d4a4a' : '#0a2c2c', live ? '#1f8f86' : '#124845', '#9ccdc4', 'SEAL', live ? '#05282a' : '#0a2c2c');
  if (hot) button(c.fire, pressed, '#47101a', blink ? '#93282b' : '#6b1a22', '#93282b', 'HOT', '#f0a07a');
  else button(c.fire, pressed, live ? '#99101c' : '#47101a', live ? '#f02a2a' : '#6b1a22', '#ff9a7a', 'FIRE', '#3d060c');
  drawText('RB-1', vr + 8, vb - 18, LIGHT);
  box(vr + 36, vb - 18, 6, 6, led, DARK);
}
