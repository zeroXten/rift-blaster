// What the player cannot see, shown around the edge of the screen. Each kind of thing has its
// own shape, and nothing flashes unless it means something:
//   arrow          a rift, in the rift's colour and steady; bigger when the rift is wider
//   two arrowheads that rift is behind the player
//   turning ring   around an arrow: that rift is weak enough to seal
//   dot            a creature, in its rift's colour
//   big red dot    flashing: a creature about to reach the player
//   plus           a power-up, in its own colour
// The shapes are exported so the how-to-play guide can show them.

import { UI } from './config.js';
import { view } from './projection.js';
import { px, reticle, tri } from './render.js';
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

// An arrowhead with its tip at (x, y) pointing along (dx, dy); double adds a second behind it.
export function arrowAt(x, y, dx, dy, color, size, double = false) {
  const head = (ox, s, col) => {
    const bx = x - dx * (s + ox), by = y - dy * (s + ox), nx = -dy * s * 0.75, ny = dx * s * 0.75;
    tri(x - dx * ox, y - dy * ox, bx + nx, by + ny, bx - nx, by - ny, col);
  };
  if (double) { head(size * 0.8 - 2, size + 2, UI.k); head(size * 0.8, size, color); }
  head(-2, size + 2, UI.k);
  head(0, size, color);
}

// A creature's dot. near is the big one for a creature about to arrive, flashing red.
export function dotAt(x, y, color, near, t) {
  const s = near ? 4 : 2;
  px(x - s - 1, y - s - 1, s * 2 + 3, s * 2 + 3, UI.k);
  px(x - s, y - s, s * 2 + 1, s * 2 + 1, near ? (((t * 8) | 0) & 1 ? UI.red : '#ffffff') : color);
}

// A power-up's plus sign.
export function plusAt(x, y, color) {
  px(x - 2, y - 5, 5, 11, UI.k);
  px(x - 5, y - 2, 11, 5, UI.k);
  px(x - 1, y - 4, 3, 9, color);
  px(x - 4, y - 1, 9, 3, color);
}

// One dot per creature out of sight, right at the edge of the screen. Dots that would land on
// top of each other stack inward, so a pack reads as a cluster.
function dots(game) {
  const placed = [];
  for (const c of game.creatures) {
    if (c.state !== 'active' || c.on || c.pods) continue;
    const e = edge(c.p, 5);
    let { x, y } = e;
    for (let tries = 0; tries < 8 && placed.some(q => Math.abs(q.x - x) < 8 && Math.abs(q.y - y) < 8); tries++) {
      x -= e.dx * 8;
      y -= e.dy * 8;
    }
    placed.push({ x, y });
    dotAt(x, y, DIMS[c.dim].ramp[2], c.r < NEAR && c.def.damage > 0, game.t);
  }
}

export function drawIndicators(game) {
  const t = game.t;
  dots(game);
  for (const item of game.pickups) {
    if (item.on) continue;
    const e = edge(item.p, 9);
    plusAt(e.x, e.y, item.def.color);
  }
  for (const rift of game.rifts) {
    if (rift.sealed || rift.on) continue;
    const size = 6 + rift.stage * 2, e = edge(rift.p, 10), pulse = Math.sin(t * 8) * 1.5;
    const x = e.x + e.dx * pulse, y = e.y + e.dy * pulse;
    arrowAt(x, y, e.dx, e.dy, DIMS[rift.dim].ramp[2], size, !rift.p.front);
    if (!rift.locked) reticle(x - e.dx * size * 0.6, y - e.dy * size * 0.6, size + 5, t);
  }
}
