// Pixel particles and the shot beam. Particles are anchored to a world direction plus a
// pixel offset, so bursts stay pinned to the room as the player turns.

import { PAL } from './palette.js';
import { pick, project, rand, TAU, view } from './projection.js';
import { R } from './render.js';

const MAX = 420;
const parts = [];
const P = {};

export const beam = { t: 0, hit: false };

export function clearFx() {
  parts.length = 0;
  beam.t = 0;
}

function add(p) {
  if (parts.length < MAX) parts.push(p);
}

const copy = d => (d ? [d[0], d[1], d[2]] : null);

// dir null = screen space, with x/y absolute.
export function burst(dir, n, colors, speed = 40, life = 0.5, opts = {}) {
  const { x = 0, y = 0, spread = 0, g = 60, size = 1 } = opts;
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), v = speed * rand(0.3, 1);
    add({
      dir: copy(dir),
      x: x + rand(-spread, spread), y: y + rand(-spread, spread),
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      g, life: life * rand(0.5, 1), c: pick(colors),
      s: size + (Math.random() < 0.3 ? 1 : 0),
    });
  }
}

// Break a sprite apart into its own pixels.
export function spriteBurst(dir, spr, frame, scale, flip = false) {
  const pixels = spr.pixels[frame] || spr.pixels[0];
  const step = pixels.length > 140 ? 3 : pixels.length > 70 ? 2 : 1;
  const s = Math.max(1, Math.round(scale * 0.8));
  for (let i = 0; i < pixels.length; i += step) {
    const q = pixels[i];
    const ox = (q.x - spr.w / 2 + 0.5) * scale * (flip ? -1 : 1), oy = (q.y - spr.h / 2 + 0.5) * scale;
    add({
      dir: copy(dir), x: ox, y: oy,
      vx: ox * rand(2, 5) + rand(-12, 12), vy: oy * rand(2, 5) - rand(0, 30),
      g: 130, life: rand(0.3, 0.75), c: q.c, s,
    });
  }
}

// Pixels rushing inward as a rift seals.
export function implodeFx(dir, r, colors) {
  for (let i = 0; i < 28; i++) {
    const a = rand(TAU), d = r * rand(1.2, 1.9), life = rand(0.25, 0.45);
    add({
      dir: copy(dir), x: Math.cos(a) * d, y: Math.sin(a) * d,
      vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d / life,
      g: 0, life, c: pick(colors), s: 2,
    });
  }
}

export function steam(x, y) {
  add({ dir: null, x: x + rand(-3, 3), y, vx: rand(-6, 6), vy: rand(-34, -16), g: -10, life: rand(0.4, 0.9), c: pick([PAL.w, PAL.l, PAL.g]), s: 1 });
}

export function fireBeam(hit) {
  beam.t = 0.09;
  beam.hit = hit;
}

export function updateFx(dt) {
  beam.t -= dt;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts[i] = parts[parts.length - 1];
      parts.pop();
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawFx() {
  for (const p of parts) {
    let x = p.x, y = p.y;
    if (p.dir) {
      project(p.dir, P);
      if (!P.vis) continue;
      x += P.x;
      y += P.y;
    }
    R.rect(x, y, p.s, p.s, p.c);
  }
}

// Twin emitters at the bottom of the screen converging on the crosshair.
export function drawBeam() {
  if (beam.t <= 0) return;
  const k = beam.t / 0.09;
  const cx = view.cx, cy = view.cy, by = R.h - R.safeBottom - 16;
  for (const side of [-1, 1]) {
    R.line(cx + side * 16, by, cx, cy, PAL.T, 3);
    R.line(cx + side * 16, by, cx, cy, k > 0.5 ? PAL.w : PAL.C, 1);
    R.disc(cx + side * 16, by, 2 + k * 2, PAL.C);
  }
  R.disc(cx, cy, (beam.hit ? 5 : 2) * k + 1, PAL.w);
}
