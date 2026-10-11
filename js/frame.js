// The scanner's casing: the border around the screen that makes the phone read as a device.
// Thin strips above and below the screen carry the gauges; the grips either side carry the
// controls, with the fire button under the right thumb. Drawn over the edges of the world,
// so anything that strays off the screen disappears behind it.

import { UI } from './config.js';
import { R, box, disc, px, ring } from './render.js';
import { drawText } from './font.js';

const CASE = '#1b2030', KEY = '#262c40', LIGHT = '#3a4460', DARK = '#0a0c14', GROOVE = '#141826';

// Where the controls are drawn.
function controls() {
  const v = R.view;
  return {
    pause: { x: v.x - 28, y: v.y + 6, w: 24, h: 22 },
    recal: { x: v.x - 28, y: v.y + 36, w: 24, h: 22 },
    fire: { x: v.x + v.w + 22, y: Math.round(R.h * 0.56), r: 17 },
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

// What a touch at canvas point p lands on: 'fire', 'pause', 'recal', 'case' (dead casing), or
// null for the screen itself. Touch targets are much larger than the drawn controls: the whole
// right grip fires.
export function frameHit(p) {
  const v = R.view;
  if (p.x >= v.x + v.w) return 'fire';
  if (p.x < v.x) return p.y < v.y + 32 ? 'pause' : p.y < v.y + 64 ? 'recal' : 'case';
  return p.y < v.y || p.y >= v.y + v.h ? 'case' : null;
}

function keycap(b, lit) {
  px(b.x, b.y + 1, b.w, b.h, DARK);
  box(b.x, b.y, b.w, b.h - 1, KEY, lit ? LIGHT : GROOVE);
}

// live: in play, so the controls are lit. pressed / hot: the fire button's state. led: status light colour.
export function drawFrame({ live = false, pressed = false, hot = false, led = UI.dim } = {}) {
  const { w, h, view: v } = R, vr = v.x + v.w, vb = v.y + v.h;
  const c = controls(), g = gauges(), blink = ((performance.now() / 160) | 0) & 1;

  // Body, with a lit top edge and a shadowed bottom edge.
  px(0, 0, w, v.y, CASE);
  px(0, vb, w, h - vb, CASE);
  px(0, v.y, v.x, v.h, CASE);
  px(vr, v.y, w - vr, v.h, CASE);
  px(0, 0, w, 1, LIGHT);
  px(0, h - 1, w, 1, DARK);

  // Grip ridges where the hands go.
  for (let y = c.recal.y + c.recal.h + 10; y < vb - 22; y += 3) px(5, y, v.x - 12, 1, GROOVE);
  for (let y = v.y + 6; y < vb - 4; y += 3) {
    if (Math.abs(y - c.fire.y) > c.fire.r + 7) px(vr + 7, y, w - vr - 12, 1, GROOVE);
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

  // Left grip: pause, recalibrate, status light.
  const ink = live ? UI.c : LIGHT;
  keycap(c.pause, live);
  px(c.pause.x + 8, c.pause.y + 6, 3, 9, ink);
  px(c.pause.x + 13, c.pause.y + 6, 3, 9, ink);
  keycap(c.recal, live);
  ring(c.recal.x + 12, c.recal.y + 11, 5, 0, 6.3, ink);
  px(c.recal.x + 12, c.recal.y + 3, 1, 5, ink);
  px(c.recal.x + 12, c.recal.y + 11, 1, 1, ink);
  drawText('RB-1', v.x - 28, vb - 18, LIGHT);
  box(v.x - 28, vb - 8, 6, 6, led, DARK);

  // Right grip: the fire button, sunk a pixel while pressed and dark while overheated.
  const f = c.fire, d = pressed ? 1 : 0;
  disc(f.x, f.y + 2, f.r + 3, DARK);
  disc(f.x, f.y + d, f.r, hot || !live ? '#47101a' : '#99101c');
  disc(f.x - 1, f.y - 2 + d * 2, f.r - 3, hot ? (blink ? '#93282b' : '#6b1a22') : !live ? '#6b1a22' : pressed ? '#ff9a7a' : '#f02a2a');
  drawText(hot ? 'HOT' : 'FIRE', f.x + 1, f.y - 4 + d, hot ? '#f0a07a' : '#3d060c', 1, 0.5);
}
