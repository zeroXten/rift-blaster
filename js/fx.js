// Screen-space effects: pixel bursts, the scanner's beam, flashes, steam.

import { UI } from './config.js';
import { view } from './projection.js';
import { R, disc, line, px, ring } from './render.js';
import { pick, rand } from './util.js';

const MAX_PARTS = 400;

// A crack in the scanner's screen, as points in 0-1 screen space: in from an edge, wandering inward.
function makeCrack() {
  const side = (Math.random() * 4) | 0;
  let x = side === 0 ? 0 : side === 1 ? 1 : Math.random(), y = side === 2 ? 0 : side === 3 ? 1 : Math.random();
  let ang = Math.atan2(0.5 - y, 0.5 - x) + rand(-0.6, 0.6);
  const points = [[x, y]];
  for (let i = 4 + ((Math.random() * 3) | 0); i > 0; i--) {
    ang += rand(-0.7, 0.7);
    const len = rand(0.05, 0.11);
    x += Math.cos(ang) * len;
    y += Math.sin(ang) * len * 1.8;
    points.push([x, y]);
  }
  return points;
}
const STEAM = ['#f4f4f4', '#9ccdc4', '#6aa6a6'];

// Beam colours as [glow, body, core]: red with a hot core, burning yellow-white when the
// scanner is close to overheating.
const BEAM_COOL = ['#6b0f1a', '#ff4a3a', '#ffe9a0'];
const BEAM_HOT = ['#b55e0a', '#ffd23f', '#ffffff'];
// The seal stream is the SEAL button's colours, as the beam is the FIRE button's.
const STREAM = { glow: '#0d4a4a', body: '#39e6d0', core: '#ffffff', arc: '#7fb4ff', spark: '#ffd23f' };
const BEAM_TIME = 0.16;

export class Fx {
  constructor() {
    this.parts = [];
    this.bolt = null;     // the beam being drawn: { t, hit, pal }
    this.zapT = 0;
    this.zx = 0;
    this.zy = 0;
    this.red = 0;         // damage flash
    this.glitch = 0;      // camera feed tearing
    this.white = 0;
    this.steam = false;   // set by the weapon while overheated
    this.rings = [];      // expanding shockwaves: { x, y, t, colors }
    this.sealing = 0;     // seal progress while the seal stream is on, set by the weapon
    this.sealX = 0;       // where the rift it is holding is on screen
    this.sealY = 0;
    this.cracks = Array.from({ length: 8 }, makeCrack);
    this.cracked = 0;     // how many of them are showing
    this.crackAt = 0;
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
  implode(x, y, colors, radius, n = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = radius * rand(0.6, 1.3), life = rand(0.3, 0.5);
      const c = Math.cos(a), s = Math.sin(a);
      this.add(x + c * r, y + s * r, (-c * r) / life, (-s * r) / life, life, pick(colors), 2);
    }
    if (n >= 30) this.white = 0.12;
  }

  // A big blast: shockwave rings, a spray of pixels and a flash.
  nova(x, y, colors) {
    this.rings.push({ x, y, t: 0, colors });
    this.burst(x, y, colors, 40, 150, 2);
    this.white = 0.18;
  }

  // end is 'hit', 'miss' or 'absorb' (swallowed by a rift, whose colours are passed as tint).
  // heat is the scanner's heat (0-100) as the shot leaves.
  shot(end, heat = 0, tint = null) {
    const pal = heat > 80 ? BEAM_HOT : BEAM_COOL;
    this.bolt = { t: 0, end, pal, tint };
    if (end === 'hit') this.burst(view.cx, view.cy, [pal[2], pal[1], pal[1]], 10, 80);
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
    if (this.bolt && (this.bolt.t += dt) > BEAM_TIME) this.bolt = null;
    this.zapT -= dt;
    this.red = Math.max(0, this.red - dt);
    this.glitch = Math.max(0, this.glitch - dt);
    this.white = Math.max(0, this.white - dt);
    for (const r of this.rings) r.t += dt;
    if (this.rings.length && this.rings[0].t > 0.45) this.rings.shift();
    // Sparks dragged into the rift the seal stream is closing.
    if (this.sealing > 0 && Math.random() < 0.5) {
      const a = Math.random() * 6.283, r = rand(18, 34);
      this.add(this.sealX + Math.cos(a) * r, this.sealY + Math.sin(a) * r, -Math.cos(a) * r * 3, -Math.sin(a) * r * 3, 0.3, Math.random() < 0.5 ? STREAM.spark : STREAM.core);
    }
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
    for (const r of this.rings) {
      const k = r.t / 0.45, n = r.colors.length;
      ring(r.x, r.y, 6 + k * 70, 0, 6.3, r.colors[n - 1], k < 0.5 ? 2 : 1);
      ring(r.x, r.y, 3 + k * 45, 0, 6.3, r.colors[n - 2] || r.colors[0]);
    }
    if (this.zapT > 0) line(this.zx, this.zy, view.cx, by, ((this.zapT * 40) | 0) & 1 ? '#ffe9a0' : '#ffa91f', 2);
    if (this.sealing > 0) this.drawStream(by);
    if (this.bolt) this.drawBeam(this.bolt, by);
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

  // The seal stream: a thick, writhing rope of energy from the scanner to the rift it is
  // closing, with a second strand wound round it and arcs crackling off it, and a clamp of
  // arcs at the rift that tightens as the seal completes. Nothing like the straight beam of a shot.
  drawStream(by) {
    const ctx = R.ctx, t = performance.now() / 1000, p = this.sealing;
    const x0 = view.cx, x1 = this.sealX, y1 = Math.round(this.sealY), len = by - y1;
    if (len < 4) return;
    const at = y => {
      const u = (by - y) / len, slack = Math.sin(u * Math.PI);
      return x0 + (x1 - x0) * u + Math.sin(u * 9 - t * 16) * 5 * slack + Math.sin(u * 23 + t * 11) * 2 * slack;
    };
    for (let y = by - 1; y >= y1; y--) {
      const u = (by - y) / len, x = Math.round(at(y)), w = 2 + Math.round(2 * (1 - u));
      ctx.fillStyle = STREAM.glow;
      ctx.fillRect(x - w - 1, y, w * 2 + 3, 1);
      ctx.fillStyle = ((y + ((t * 60) | 0)) & 7) < 2 ? STREAM.core : STREAM.body;
      ctx.fillRect(x - w, y, w * 2 + 1, 1);
      ctx.fillStyle = STREAM.core;
      ctx.fillRect(x, y, 1, 1);
      // The second strand, winding round the first.
      ctx.fillStyle = STREAM.arc;
      ctx.fillRect(x + Math.round(Math.cos(u * 26 - t * 22) * (w + 3) * Math.sin(u * Math.PI)), y, 2, 1);
    }
    // Arcs jumping off the stream.
    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.45) continue;
      const y = y1 + Math.random() * len, x = at(y), side = Math.random() < 0.5 ? -1 : 1;
      const mx = x + side * rand(5, 11), my = y - rand(2, 7);
      line(x, y, mx, my, STREAM.arc);
      line(mx, my, mx + side * rand(2, 8), my - rand(1, 6), STREAM.core);
    }
    // The clamp at the rift: arcs that close in and spin faster as the seal completes.
    const r = 22 - 13 * p, spin = t * (4 + 10 * p);
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      ring(x1, y1, r + 1, a, a + 1.2, STREAM.glow, 3);
      ring(x1, y1, r, a, a + 1.2, ((t * 12) | 0) & 1 ? STREAM.core : STREAM.spark, 2);
    }
    disc(x1, y1, 2 + Math.round(p * 2), STREAM.core);
  }

  // One straight beam from the bottom of the screen to the crosshair: wide where it leaves the
  // scanner and narrow where it lands, for depth, with a glow around a white core. It opens with
  // a fat flash, bright slugs race up it, and it thins away to nothing. A hit ends in a small
  // star and an expanding ring. Fired into a rift, the beam frays and takes on the rift's colour
  // toward the far end, and a ring closes in on the point where it is swallowed.
  drawBeam(beam, by) {
    const ctx = R.ctx, [glow, body, core] = beam.pal, p = beam.t / BEAM_TIME;
    const cx = Math.round(view.cx), top = Math.round(view.cy), len = by - top;
    const k = p < 0.2 ? 1.5 : 1.15 - p;
    const span = (hw, y, color) => {
      const w = Math.max(1, Math.round(hw * 2)) | 1;
      ctx.fillStyle = color;
      ctx.fillRect(cx - (w >> 1), y, w, 1);
    };
    const eaten = beam.end === 'absorb', tick = (beam.t * 60) | 0;
    for (let y = by - 1; y >= top; y--) {
      const d = by - y, u = d / len, hw = (7 * (1 - u) + 1.2) * k;
      const slug = (((d - beam.t * 900) % 18) + 18) % 18 < 5;
      if (eaten && u > 0.55) {
        // The far end breaks into flickering dashes in the rift's colour.
        if ((d + tick * 3) % 6 < 3) span(hw, y, beam.tint[u > 0.8 ? 1 : 2]);
        continue;
      }
      if (p < 0.7) span(hw + 1.5, y, glow);
      span(hw, y, p < 0.2 ? core : body);
      span(hw * (slug ? 0.8 : 0.4), y, core);
    }
    if (p < 0.5) {
      // Muzzle flash, half hidden by the casing.
      disc(cx, by, Math.round(8 * k), body);
      disc(cx, by, Math.round(5 * k), core);
    }

    if (eaten) {
      ring(cx, top, 15 * (1 - p) + 2, 0, 6.3, beam.tint[p < 0.5 ? 3 : 2]);
      ring(cx, top, 9 * (1 - p) + 1, 0, 6.3, beam.tint[1]);
    } else if (beam.end === 'hit') {
      ring(cx, top, 3 + p * 10, 0, 6.3, p < 0.5 ? core : body);
      if (p < 0.35) {
        const r = 7 - p * 8;
        line(cx - r, top, cx + r, top, core);
        line(cx, top - r, cx, top + r, core);
        px(cx - 2, top - 2, 5, 5, core);
      }
    } else if (p < 0.35) {
      px(cx - 1, top - 1, 3, 3, core);
    }
  }

  // Damage to the player shows on the scanner itself: its screen cracks a little more with
  // every eighth of health lost, each new crack flashing as it appears, and the edge pulses red
  // when health is low. The cracks go again as health is restored.
  drawDamage(health) {
    const ctx = R.ctx, { x0, y0, w, h } = view, now = performance.now();
    const n = Math.min(this.cracks.length, Math.ceil((100 - health) / 12.5));
    if (n > this.cracked) this.crackAt = now;
    this.cracked = n;
    // White on a dark outline, so they show against any room. The newest is drawn heavier
    // for a moment, with a chip where it started.
    const fresh = now - this.crackAt < 500;
    for (let i = 0; i < n; i++) {
      const c = this.cracks[i], heavy = fresh && i === n - 1;
      const at = j => [x0 + c[j][0] * w, y0 + c[j][1] * h];
      for (let j = 1; j < c.length; j++) line(...at(j - 1), ...at(j), UI.k, heavy ? 5 : 3);
      for (let j = 1; j < c.length; j++) line(...at(j - 1), ...at(j), '#ffffff', heavy ? 3 : 1);
      const [sx, sy] = at(0);
      px(sx - 3, sy - 3, 7, 7, UI.k);
      px(sx - 2, sy - 2, 5, 5, heavy ? '#ffffff' : '#d5e6ff');
    }
    if (health < 30 && ((now / 300) | 0) & 1) {
      ctx.globalAlpha = 0.55;
      px(x0, y0, w, 3, UI.red);
      px(x0, y0 + h - 3, w, 3, UI.red);
      px(x0, y0, 3, h, UI.red);
      px(x0 + w - 3, y0, 3, h, UI.red);
      ctx.globalAlpha = 1;
    }
  }
}
