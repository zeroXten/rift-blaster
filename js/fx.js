// Screen-space effects: pixel bursts, the beam, flashes, steam.

import { UI } from './config.js';
import { view } from './projection.js';
import { R, line, px } from './render.js';
import { pick, rand } from './util.js';

const MAX_PARTS = 400;
const STEAM = ['#f4f4f4', '#9ccdc4', '#6aa6a6'];

export class Fx {
  constructor() {
    this.parts = [];
    this.beam = 0;
    this.beamHit = false;
    this.zapT = 0;
    this.zx = 0;
    this.zy = 0;
    this.red = 0;         // damage flash
    this.glitch = 0;      // camera feed tearing
    this.white = 0;
    this.steam = false;   // set by the weapon while overheated
  }

  add(x, y, vx, vy, life, color, size = 1, grav = 0) {
    if (this.parts.length < MAX_PARTS) this.parts.push({ x, y, vx, vy, life, color, size, grav });
  }

  burst(x, y, colors, n, speed, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = speed * rand(0.3, 1);
      this.add(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.25, 0.6), pick(colors), size, 120);
    }
  }

  // Pixels pulled into a point: a rift sealing.
  implode(x, y, colors, radius) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.283, r = radius * rand(0.6, 1.3), life = rand(0.3, 0.5);
      const c = Math.cos(a), s = Math.sin(a);
      this.add(x + c * r, y + s * r, (-c * r) / life, (-s * r) / life, life, pick(colors), 2);
    }
    this.white = 0.12;
  }

  shot(hit) {
    this.beam = 0.09;
    this.beamHit = hit;
    if (hit) this.burst(view.cx, view.cy, ['#ffffff', UI.c], 6, 60);
  }

  // An Ootheen's glare landing.
  zap(x, y) {
    this.zapT = 0.18;
    this.zx = x;
    this.zy = y;
  }

  hurt() {
    this.red = 0.45;
    this.glitch = 0.4;
  }

  update(dt) {
    this.beam -= dt;
    this.zapT -= dt;
    this.red = Math.max(0, this.red - dt);
    this.glitch = Math.max(0, this.glitch - dt);
    this.white = Math.max(0, this.white - dt);
    if (this.steam && Math.random() < 0.6) {
      this.add(view.cx + rand(-70, 70), view.y0 + view.h - 2, rand(-6, 6), -rand(20, 50), rand(0.4, 0.8), pick(STEAM), Math.random() < 0.3 ? 2 : 1);
    }
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw() {
    const ctx = R.ctx, { x0, y0, w, h } = view, by = y0 + h;
    for (const p of this.parts) px(p.x, p.y, p.size, p.size, p.color);
    if (this.zapT > 0) line(this.zx, this.zy, view.cx, by, ((this.zapT * 40) | 0) & 1 ? '#ffe9a0' : '#ffa91f', 2);
    if (this.beam > 0) {
      // A short beam from the bottom of the screen to the crosshair, with a flash where it lands.
      line(view.cx, by, view.cx, view.cy, UI.c, 3);
      line(view.cx, by, view.cx, view.cy, '#ffffff', 1);
      const r = this.beamHit ? 4 : 2;
      if (this.beam > 0.04) px(view.cx - r, view.cy - r, r * 2 + 1, r * 2 + 1, '#ffffff');
    }
    if (this.red > 0) {
      ctx.globalAlpha = (this.red / 0.45) * 0.45;
      px(x0, y0, w, h, UI.red);
      ctx.globalAlpha = 1;
    }
    if (this.white > 0) {
      ctx.globalAlpha = Math.min(0.7, this.white * 3);
      px(x0, y0, w, h, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }
}
