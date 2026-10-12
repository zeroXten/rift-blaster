// What the player cannot see, shown around the edge of the screen. Every unsealed rift that
// is off screen gets an arrow in its dimension's colour, so a rift can be found from the
// arrows alone. Every creature that is off screen gets a dot, so the more of them there are
// out there, the more dots there are. A power-up waiting to be taken gets a small arrow in
// its own colour.

import { UI } from './config.js';
import { view } from './projection.js';
import { px, tri } from './render.js';
import { DIMS } from './sprites.js';
import { NEAR } from './creatures/base.js';

// The point where the direction toward a projected target leaves the screen, `inset` pixels in
// from the edge, and that direction as a unit vector.
function edge(p, inset) {
  // Behind the player only the camera-space direction is meaningful.
  let dx, dy;
  if (p.front) { dx = p.x - view.cx; dy = p.y - view.cy; }
  else {
    dx = p.lx; dy = -p.ly * 0.6;
    if (Math.abs(dx) < 0.2) dx = dx < 0 ? -0.2 : 0.2;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const l = view.x0 + inset, r = view.x0 + view.w - inset, top = view.y0 + inset, bot = view.y0 + view.h - inset;
  const tx = dx > 0 ? (r - view.cx) / dx : dx < 0 ? (l - view.cx) / dx : Infinity;
  const ty = dy > 0 ? (bot - view.cy) / dy : dy < 0 ? (top - view.cy) / dy : Infinity;
  const k = Math.min(tx, ty);
  return { x: view.cx + dx * k, y: view.cy + dy * k, dx, dy };
}

function arrow(p, color, size, t, double) {
  const e = edge(p, 10), { dx, dy } = e, pulse = Math.sin(t * 8) * 1.5;
  const x = e.x + dx * pulse, y = e.y + dy * pulse;
  const head = (ox, s, col) => {
    const bx = x - dx * (s + ox), by = y - dy * (s + ox), nx = -dy * s * 0.75, ny = dx * s * 0.75;
    tri(x - dx * ox, y - dy * ox, bx + nx, by + ny, bx - nx, by - ny, col);
  };
  if (double) { head(size * 0.8 - 2, size + 2, UI.k); head(size * 0.8, size, color); }
  head(-2, size + 2, UI.k);
  head(0, size, color);
}

// One dot per creature out of sight, in its dimension's colour, right at the edge of the
// screen. Dots that would land on top of each other stack inward, so a pack reads as a
// cluster. One that is about to arrive is bigger and flashes red.
function dots(game) {
  const placed = [], flash = ((game.t * 8) | 0) & 1;
  for (const c of game.creatures) {
    if (c.state !== 'active' || c.on || c.pods) continue;
    const e = edge(c.p, 5), near = c.r < NEAR && c.def.damage > 0;
    let { x, y } = e;
    for (let tries = 0; tries < 8 && placed.some(q => Math.abs(q.x - x) < 8 && Math.abs(q.y - y) < 8); tries++) {
      x -= e.dx * 8;
      y -= e.dy * 8;
    }
    placed.push({ x, y });
    const s = near ? 4 : 2;
    px(x - s - 1, y - s - 1, s * 2 + 3, s * 2 + 3, UI.k);
    px(x - s, y - s, s * 2 + 1, s * 2 + 1, near ? (flash ? UI.red : '#ffffff') : DIMS[c.dim].ramp[2]);
  }
}

export function drawIndicators(game) {
  const t = game.t;
  dots(game);
  for (const item of game.pickups) {
    if (!item.on) arrow(item.p, item.def.color, 4, t * 1.5, false);
  }
  for (const rift of game.rifts) {
    if (rift.sealed || rift.on) continue;
    const st = rift.stage, ramp = DIMS[rift.dim].ramp;
    // Wider rifts get bigger arrows that blink faster. A doubled arrow means "behind you".
    // One that is ready to seal, and so is costing reality, strobes white and cyan.
    const blink = st > 0 && ((t * (st + 1) * 2) | 0) & 1;
    const color = !rift.locked ? (((t * 10) | 0) & 1 ? '#ffffff' : UI.c) : blink ? '#ffffff' : ramp[2];
    arrow(rift.p, color, (rift.locked ? 6 : 8) + st * 2, t, !rift.p.front);
  }
}
