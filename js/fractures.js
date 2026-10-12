// Fractures in reality. As Reality Integrity falls, the room itself starts to come apart:
// cracks hang in the air with slabs of the picture slipped out of place around them. They are
// fixed points in space, like rifts, so they stay where they are as the player turns; the
// lower reality gets the more of them there are, and they mend as it recovers.

import { level } from './config.js';
import { DEG, dirFromBearing, project, view } from './projection.js';
import { R, line, px } from './render.js';
import { rand } from './util.js';

const PER = 4;            // one fracture for every this many % of reality lost
const MAX = 22;
const d = [0, 0, 0], p = {}, q = {};
// Fractures are drawn in colours nothing else uses, so they are not mistaken for the cracks
// in the scanner's own screen.
const GLOW = '#5a1a6e', CORE = '#ff5ad6', HOT = '#ffffff';

// One fracture: a jagged crack with a branch or two, and slabs of the room knocked sideways.
// Everything is in degrees from the fracture's own bearing.
function make(yaw, pitch, scale, deep) {
  const crack = [];
  let x = rand(-3, 3), y = -rand(7, 11) * scale;
  for (let n = 6 + ((Math.random() * 3) | 0); n > 0; n--) {
    crack.push([x, y]);
    x += rand(-3.5, 3.5) * scale;
    y += rand(2, 4) * scale;
  }
  const branches = [];
  for (let n = 1 + ((Math.random() * 2) | 0); n > 0; n--) {
    let [bx, by] = crack[1 + ((Math.random() * (crack.length - 2)) | 0)];
    const side = Math.random() < 0.5 ? -1 : 1, branch = [[bx, by]];
    for (let i = 0; i < 3; i++) {
      bx += side * rand(2, 4.5) * scale;
      by += rand(-2.5, 2.5) * scale;
      branch.push([bx, by]);
    }
    branches.push(branch);
  }
  const slabs = [];
  for (let n = 2 + ((Math.random() * 2) | 0); n > 0; n--) {
    slabs.push({
      x: rand(-7, 7) * scale, y: rand(-9, 9) * scale, w: rand(7, 13) * scale, h: rand(1.6, 4) * scale,
      shift: (Math.random() < 0.5 ? -1 : 1) * rand(4, 10), negative: deep && Math.random() < 0.5,
    });
  }
  return { yaw, pitch, crack, branches, slabs, grow: 0, seed: (Math.random() * 1000) | 0 };
}

export class Fractures {
  constructor() {
    this.list = [];
  }

  // Keeps the number of fractures in step with how much reality has been lost.
  update(dt, game) {
    const want = Math.min(MAX, Math.floor((100 - game.reality) / PER)), have = this.list.length;
    if (have < want) {
      // About half appear somewhere near where the player is looking, so the damage is seen
      // happening; the rest anywhere the difficulty lets things be.
      const near = Math.random() < 0.5, arc = level.arc;
      const yaw = near ? view.yaw + rand(-45, 45) * DEG : rand(-arc, arc) * DEG;
      const lost = 1 - game.reality / 100;
      this.list.push(make(game.inArc(yaw, 25), rand(-16, 16) * DEG, 1 + lost * 0.7, lost > 0.55));
    } else if (have > want + 1 || (want === 0 && have)) {
      this.list.pop();      // the newest mends first
    }
    for (const f of this.list) f.grow = Math.min(1, f.grow + dt * 2.5);
  }

  // Drawn straight after the room and before anything in it, so creatures pass in front.
  draw() {
    const ctx = R.ctx, { x0, y0, w, h, f: focal } = view, tick = (performance.now() / 110) | 0;
    const point = (f, [dx, dy], out) => project(dirFromBearing(f.yaw + dx * DEG, f.pitch + dy * DEG, d), out);
    for (const f of this.list) {
      const centre = point(f, [0, 0], p);
      if (!centre.front || centre.x < x0 - 90 || centre.x > x0 + w + 90) continue;

      // Slabs of the room slipped sideways, some of them turned negative. Now and then one jumps.
      for (const s of f.slabs) {
        const c = point(f, [s.x, s.y], q);
        if (!c.front) continue;
        const sw = focal * Math.tan(s.w * DEG) * f.grow, sh = Math.max(2, focal * Math.tan(s.h * DEG));
        const l = Math.max(x0, Math.round(c.x - sw / 2)), r = Math.min(x0 + w, Math.round(c.x + sw / 2));
        const t = Math.max(y0, Math.round(c.y - sh / 2)), b = Math.min(y0 + h, Math.round(c.y + sh / 2));
        if (r - l < 3 || b - t < 2) continue;
        const jump = (tick + f.seed + ((s.w * 7) | 0)) % 13 === 0 ? 2 : 1;
        ctx.drawImage(R.canvas, l, t, r - l, b - t, l + Math.round(s.shift * jump), t, r - l, b - t);
        if (s.negative) {
          ctx.globalCompositeOperation = 'difference';
          px(l + s.shift, t, r - l, b - t, '#ffffff');
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 0.16;
        px(l + s.shift, t, r - l, b - t, CORE);
        ctx.globalAlpha = 1;
        px(l + s.shift, t, r - l, 1, CORE);
        px(l + s.shift, b - 1, r - l, 1, GLOW);
      }

      // The crack itself, growing out from its top as it forms.
      const stroke = (pts, shown) => {
        const n = Math.max(1, Math.round((pts.length - 1) * shown));
        for (let i = 1; i <= n; i++) {
          const a = point(f, pts[i - 1], p), ax = a.x, ay = a.y, af = a.front;
          const e = point(f, pts[i], q);
          if (!af || !e.front) continue;
          line(ax, ay, e.x, e.y, GLOW, 4);
          line(ax, ay, e.x, e.y, (tick + f.seed + i) % 5 === 0 ? HOT : CORE, 2);
        }
      };
      stroke(f.crack, f.grow);
      if (f.grow >= 1) for (const branch of f.branches) stroke(branch, 1);
    }
  }
}
