// Rifts: fixed points on the sphere that widen through crack, tear and breach, push creatures
// through, and can be sealed by holding the crosshair on them.

import { RIFT_DIST, RIFT_FULL_TIME, STAGE_BREACH, STAGE_TEAR, level } from './config.js';
import { DEG, dirFromBearing, onScreen, project, view } from './projection.js';
import { R, line, px } from './render.js';
import { DIMS } from './sprites.js';
import { DIM_SPAWN } from './incidents.js';
import { play } from './audio/sfx.js';
import { scanner } from './scanner.js';

const VOID = '#05050a';
const SEAL_RAMP = ['#6aa6a6', '#9ccdc4', '#f4f4f4', '#ffffff'];
const KNOTS = 7, MID = KNOTS >> 1;
const CRACK_RUSH = 4;      // how much faster a rift widens while it is still a crack
const RESPITE = 3;         // seconds before the next arrival once a full rift has room again

// The outline of one rift: a zig-zag spine with an uneven opening on either side of it, so it
// reads as a fracture in the air (cracked glass, a lightning bolt) and never as a smooth oval.
// Values are fractions that drawRiftShape scales. The spine passes through the rift's centre,
// which is where creatures come out.
export function makeShape() {
  const flip = Math.random() < 0.5 ? -1 : 1, r = (a, b) => a + Math.random() * (b - a);
  const spine = [r(-0.4, 0.4), r(0.5, 1), -r(0.4, 1), 0, r(0.4, 1), -r(0.5, 1), r(-0.4, 0.4)].map(v => v * flip);
  const left = [0, r(0.25, 0.6), 1, r(0.6, 0.85), r(0.2, 0.5), r(0.4, 0.8), 0];
  const right = [0, r(0.4, 0.8), r(0.2, 0.5), r(0.6, 0.85), 1, r(0.25, 0.6), 0];
  const noise = Array.from({ length: 64 }, () => Math.random() * 2 - 1);
  return { spine, left, right, noise };
}

// Draws a rift at a screen position. s is pixels per world unit, k scales the whole shape
// (opening and sealing animations). Each stage has its own art: a hairline crack, a narrow
// jagged tear, and a wide breach whose edges crawl.
export function drawRiftShape(cx, cy, s, width, t, ramp, shape, k = 1, deep = false) {
  const ctx = R.ctx, { spine, left, right, noise } = shape, n = noise.length;
  cx = Math.round(cx);
  cy = Math.round(cy);
  const stage = width < STAGE_TEAR ? 0 : width < STAGE_BREACH ? 1 : 2;
  const hh = Math.max(2, Math.round((0.7 + 1.1 * width) * s * k));
  const maxHw = stage ? (0.12 + (width - STAGE_TEAR) * 0.9) * s * k : 0;
  // How far the spine zig-zags. A deep (boss-sized) rift keeps it tight so it stays on screen.
  const sway = (2 + width * 10) * k + maxHw * (deep ? 0.12 : 0.22);
  const thick = stage === 0 && width > 0.2 ? 2 : 1, edge = stage === 2 ? 2 : 1;
  const crawl = stage === 2 ? (t * 8) | 0 : 0, flick = (t * 20) | 0, scroll = t * (stage === 2 ? 30 : 12);
  const g = { x: 0, l: 0, r: 0 };

  // Geometry of one row: the spine and both edges, interpolated between knots.
  const row = dy => {
    const pos = ((dy + hh) / (2 * hh)) * (KNOTS - 1), i = Math.min(KNOTS - 2, pos | 0), f = pos - i;
    g.x = cx + (spine[i] + (spine[i + 1] - spine[i]) * f) * sway;
    const jl = stage === 2 ? noise[(dy + 512 + crawl) % n] * 1.5 : 0;
    const jr = stage === 2 ? noise[(dy * 3 + 1536 + crawl) % n] * 1.5 : 0;
    g.l = Math.round(g.x - (left[i] + (left[i + 1] - left[i]) * f) * maxHw + jl);
    g.r = Math.max(g.l + thick, Math.round(g.x + (right[i] + (right[i + 1] - right[i]) * f) * maxHw + jr));
    return g;
  };

  for (let dy = -hh; dy <= hh; dy++) {
    const { l, r } = row(dy), y = cy + dy;
    ctx.fillStyle = ramp[1];
    ctx.fillRect(l - 1, y, r - l + 2, 1);
    ctx.fillStyle = ((dy * 7 + flick) & 7) === 0 ? '#ffffff' : ramp[3];
    ctx.fillRect(l, y, r - l, 1);
    if (r - l <= 2 * edge) continue;
    // Inside: the dark of somewhere else, with scanlines drifting through it.
    const band = Math.floor((dy + scroll) / 3);
    ctx.fillStyle = band % 7 === 0 && !deep ? ramp[1] : band % 3 === 0 ? ramp[0] : VOID;
    ctx.fillRect(l + edge, y, r - l - 2 * edge, 1);
  }
  if (!stage) {
    if (Math.random() < 0.3) px(cx + (Math.random() * 12 - 6), cy + (Math.random() * 2 - 1) * hh, 1, 1, ramp[3]);
    return;
  }

  // Distant lights in the dark.
  for (let m = 0; m < 5; m++) {
    const { l, r } = row(Math.round(noise[m * 5 + 3] * hh * 0.8));
    if (r - l > 6 && ((t * 2 + m * 1.7) | 0) % 3) {
      px(l + 3 + (noise[m * 3 + 1] * 0.5 + 0.5) * (r - l - 6), cy + noise[m * 5 + 3] * hh * 0.8, 1, 1, m & 1 ? ramp[3] : ramp[2]);
    }
  }
  // Hairline fractures branching off each corner of the zig-zag.
  const reach = maxHw * (stage === 2 ? 0.5 : 0.3) + 2 + width * 4;
  for (let i = 1; i < KNOTS - 1; i++) {
    if (i === MID) continue;
    const dy = Math.round(-hh + (i / (KNOTS - 1)) * 2 * hh), side = spine[i] < 0 ? -1 : 1, up = noise[i] < 0 ? -1 : 1;
    const { l, r } = row(dy), x0 = side < 0 ? l : r, y0 = cy + dy;
    const x1 = x0 + side * reach * 0.6, y1 = y0 + up * reach * 0.35;
    line(x0, y0, x1, y1, ramp[2]);
    line(x1, y1, x1 + side * reach * 0.4, y1 - up * reach * 0.15, ramp[1]);
  }
  // Sparks off the edges.
  for (let i = stage === 2 ? 3 : 1; i > 0; i--) {
    if (Math.random() < 0.5) continue;
    const dy = Math.round((Math.random() * 2 - 1) * hh), { l, r } = row(dy);
    px(Math.random() < 0.5 ? l - 2 - Math.random() * 4 : r + 2 + Math.random() * 4, cy + dy, 1, 1, '#ffffff');
  }
}

// Something about to come through: eyes in the dark and claws hooking over the edges of the
// rift, before the creature itself squeezes out. e runs 0 to 0.5.
export function drawBulge(cx, cy, hw, e, t, ramp, seed) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const reach = hw + 2 + e * 2 * (6 + hw * 0.4);
  for (let i = 0; i < 4; i++) {
    const side = i & 1 ? 1 : -1;
    const y = cy + (i < 2 ? -1 : 1) * (2 + hw * 0.5) + Math.sin(t * 7 + i + seed) * 1.5;
    const x = cx + side * reach;
    line(cx + side * hw * 0.4, (cy + y) / 2, x, y, ramp[2]);
    line(x, y, x + side * 2, y + 3, ramp[3]);
  }
  if ((t * 3 + seed) % 4 < 0.25) return;      // blink
  const ox = Math.round(Math.cos(seed * 5) * hw * 0.2), oy = Math.round(Math.sin(seed * 3) * hw * 0.5);
  const gap = Math.max(1, Math.round(hw * 0.2)), sz = hw > 10 ? 2 : 1;
  px(cx + ox - gap - sz, cy + oy, sz, sz, ramp[3]);
  px(cx + ox + gap, cy + oy, sz, sz, ramp[3]);
}

export class Rift {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.dim = def.dim;
    this.yaw = def.yaw * DEG;
    this.pitch = def.pitch * DEG;
    this.dir = dirFromBearing(this.yaw, this.pitch);
    this.width = def.width ?? 0.2;
    this.maxWidth = def.maxWidth ?? 1;
    this.rate = (def.growth ?? 1) / RIFT_FULL_TIME;
    this.size = def.size ?? 1;
    // A rift is held open from the other side: this many of its creatures must be shot before it will seal.
    const hold = def.lockKills ?? DIM_SPAWN[def.dim]?.hold ?? 0;
    this.lockKills = hold && Math.max(1, Math.round(hold * level.hold));
    this.bossLock = !!def.boss;
    this.kills = 0;

    this.shape = makeShape();
    this.seed = Math.random() * 6.28;
    this.t = 0;
    this.stageSeen = 0;
    this.spawnT = 0.4;
    this.seen = !def.waitSeen;
    this.queue = 0;
    this.queueType = null;
    this.stagger = 0;
    // Refreshed every frame by the creatures that came from this rift.
    this.emerging = 0;
    this.clingers = 0;
    this.alive = 0;
    this.pull = 0;

    this.sealed = false;
    this.sealAnim = 0;
    this.flare = 0;
    this.p = {};
    this.hw = 3;
    this.hh = 20;
    this.on = false;
    project(this.dir, this.p);
  }

  // 0 crack, 1 tear, 2 breach
  get stage() { return this.width < STAGE_TEAR ? 0 : this.width < STAGE_BREACH ? 1 : 2; }
  get locked() { return this.bossLock || this.kills < this.lockKills; }
  get blocked() { return this.locked || this.emerging > 0 || this.clingers > 0; }

  update(dt) {
    this.t += dt;
    if (this.flare > 0) this.flare -= dt;
    const p = project(this.dir, this.p);
    const s = (view.f / RIFT_DIST) * this.size, st = this.stage;
    this.hh = (0.7 + 1.1 * this.width) * s;
    this.hw = st === 0 ? 3 : (0.12 + (this.width - STAGE_TEAR) * 0.9) * s;
    this.on = onScreen(p, this.hw, this.hh);
    if (this.sealed) { this.sealAnim += dt; return; }

    // A tutorial rift can wait as a crack until the player has found it.
    if (!this.seen) { this.seen = this.on; return; }
    // A crack lasts only a few seconds: it is a warning, not a stage to wait in. After that a
    // clinging Glomm makes the rift widen 2.5 times as fast, and two of them 4 times.
    // Difficulty slows the widening, but never the crack: nobody should wait for the first arrival.
    this.width = Math.min(this.maxWidth, this.width + this.rate * (st === 0 ? CRACK_RUSH : level.growth) * (1 + 1.5 * this.pull) * dt);
    if (st > this.stageSeen) {
      this.stageSeen = st;
      const name = st === 1 ? 'tear' : 'breach';
      play(name, p.pan);
      if (!this.def.quiet) scanner.say(name);
      this.game.emit(name);
    }

    if (this.queue > 0) {
      this.stagger -= dt;
      if (this.stagger <= 0) {
        this.game.spawn(this.queueType, this, { elite: st === 2 && Math.random() < 0.5 });
        this.emerging++;
        this.stagger = 0.45;
        if (--this.queue === 0) this.spawnT = (DIM_SPAWN[this.dim]?.interval[Math.max(0, st - 1)] ?? 0) * level.spawn;
      }
      return;
    }
    const sp = DIM_SPAWN[this.dim];
    if (!sp || st === 0 || this.emerging > 0) return;
    // No room, from this rift's own cap or the difficulty's cap on creatures in play: hold the
    // clock at a short respite. Once the player makes space the next arrival is that far off,
    // which is long enough to seal a rift whose doorway they have just cleared.
    const max = sp.max[st - 1], room = Math.min(max - this.alive, this.game.room());
    if (room <= 0) { this.spawnT = Math.max(this.spawnT, RESPITE); return; }
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const [a, b] = this.def.pack || sp.pack[st - 1];
    const n = Math.max(1, a + ((Math.random() * (b - a + 1)) | 0) + level.pack);
    this.send(Math.min(n, room), sp.type);
  }

  // Queue n creatures to push through, one after another.
  send(n, type) {
    this.queue = n;
    this.queueType = type;
    this.stagger = 0;
    play('emerge_' + this.dim, this.p.pan);
  }

  // Is the crosshair on the rift's opening? Anything fired into it is swallowed.
  covers(tolPx) {
    return !this.sealed && this.on && Math.abs(this.p.x - view.cx) < this.hw + 3 + tolPx * 0.5 && Math.abs(this.p.y - view.cy) < this.hh;
  }

  // A shot fired into the rift: it flares and nothing else happens.
  absorb() {
    this.flare = 0.22;
    play('absorb', this.p.pan);
    this.game.fx.implode(this.p.x, this.p.y, DIMS[this.dim].ramp.slice(1), this.hw + 14, 12);
  }

  seal() {
    if (this.sealed) return;
    this.sealed = true;
    this.queue = 0;
    play('seal', this.p.pan);
    if (this.on) this.game.fx.implode(this.p.x, this.p.y, DIMS[this.dim].ramp, this.hh);
    this.game.onSealed(this);
  }

  draw() {
    if (!this.on || this.sealAnim > 0.45) return;
    // Opens with a quick stretch; implodes when sealed.
    const k = this.sealed ? (1 - this.sealAnim / 0.45) ** 2 : Math.min(1, this.t * 3);
    const ramp = DIMS[this.dim].ramp;
    // Flares a shade brighter for a moment after swallowing a shot.
    const lit = this.flare > 0 ? [ramp[1], ramp[2], ramp[3], '#ffffff'] : ramp;
    drawRiftShape(this.p.x, this.p.y, (view.f / RIFT_DIST) * this.size, this.width, this.t,
      this.sealed ? SEAL_RAMP : lit, this.shape, k, this.size > 1);
    // Strength gauge: how hard the other side is still holding the rift open. It drains as the
    // rift's creatures are shot; once empty the rift can be sealed, and the gauge blinks to say so.
    if (!this.sealed && this.lockKills) {
      const w = 23, x = Math.round(this.p.x - w / 2), y = Math.round(this.p.y + this.hh + 5);
      const left = Math.max(0, 1 - this.kills / this.lockKills), weak = left === 0 && ((this.t * 5) | 0) & 1;
      px(x - 1, y - 1, w + 2, 5, weak ? '#ffffff' : VOID);
      px(x, y, w, 3, ramp[0]);
      px(x, y, Math.round(w * left), 3, ramp[3]);
    }
  }
}
