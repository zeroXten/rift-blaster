// Edge arrows: every unsealed rift that is off screen gets one in its dimension's colour,
// so a rift can be found from the arrows alone. Creatures closing in from off screen get a
// small red one.

import { UI } from './config.js';
import { view } from './projection.js';
import { tri } from './render.js';
import { DIMS } from './sprites.js';

function arrow(p, color, size, t, double) {
  // Direction on screen toward the target. Behind the player only the camera-space direction is meaningful.
  let dx, dy;
  if (p.front) { dx = p.x - view.cx; dy = p.y - view.cy; }
  else {
    dx = p.lx; dy = -p.ly * 0.6;
    if (Math.abs(dx) < 0.2) dx = dx < 0 ? -0.2 : 0.2;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;

  // Where that direction leaves the screen.
  const l = view.x0 + 10, r = view.x0 + view.w - 10, top = view.y0 + 10, bot = view.y0 + view.h - 10;
  const tx = dx > 0 ? (r - view.cx) / dx : dx < 0 ? (l - view.cx) / dx : Infinity;
  const ty = dy > 0 ? (bot - view.cy) / dy : dy < 0 ? (top - view.cy) / dy : Infinity;
  const k = Math.min(tx, ty) + Math.sin(t * 8) * 1.5;
  const x = view.cx + dx * k, y = view.cy + dy * k;

  const head = (ox, s, col) => {
    const bx = x - dx * (s + ox), by = y - dy * (s + ox), nx = -dy * s * 0.75, ny = dx * s * 0.75;
    tri(x - dx * ox, y - dy * ox, bx + nx, by + ny, bx - nx, by - ny, col);
  };
  if (double) { head(size * 0.8 - 2, size + 2, UI.k); head(size * 0.8, size, color); }
  head(-2, size + 2, UI.k);
  head(0, size, color);
}

export function drawIndicators(game) {
  const t = game.t;
  for (const c of game.creatures) {
    if (c.state === 'active' && !c.on && c.r < 5 && c.def.damage) arrow(c.p, UI.red, 4, t * 2, false);
  }
  for (const rift of game.rifts) {
    if (rift.sealed || rift.on) continue;
    const st = rift.stage, ramp = DIMS[rift.dim].ramp;
    // Wider rifts get bigger arrows that blink faster. A doubled arrow means "behind you".
    const blink = st > 0 && ((t * (st + 1) * 2) | 0) & 1;
    arrow(rift.p, blink ? '#ffffff' : ramp[2], 6 + st * 2, t, !rift.p.front);
  }
}
