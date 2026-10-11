// The Ummagog (dimension unknown, red): the boss. Assembled from separately animated parts
// (core, jaw, three segmented arms each ending in a pod) rather than one large drawing.
// The pods are its weak points and open one at a time. Destroy all three and it is stunned,
// which is the only time its rift can be sealed.

import { RIFT_DIST } from '../config.js';
import { dirFromBearing, project, view } from '../projection.js';
import { blit } from '../render.js';
import { DIMS, getSprite } from '../sprites.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { Creature } from './base.js';

const UNIT = 0.058;           // world units per boss pixel
const POD_HP = 10;
const RISE = 3, STUN = 8, DEATH = 1.4;
const SEGS = 5;

// Arm anchors on the core and resting pod positions, in boss pixels from the core's centre.
const ARMS = [
  { ax: -13, ay: -3, ex: -31, ey: -17 },
  { ax: 0, ay: -11, ex: 0, ey: -33 },
  { ax: 13, ay: -3, ex: 31, ey: -17 },
].map(a => {
  const len = Math.hypot(a.ex - a.ax, a.ey - a.ay);
  return { ...a, nx: -(a.ey - a.ay) / len, ny: (a.ex - a.ax) / len };
});

export class Ummagog extends Creature {
  static def = { sprite: 'core', size: 1, hp: POD_HP * 3, damage: 0, emerge: 1 };

  constructor(game, rift) {
    super(game, rift);
    this.state = 'active';
    this.r = RIFT_DIST - 1;
    this.jawS = getSprite('jaw', this.dim);
    this.segS = getSprite('seg', this.dim);
    this.podS = getSprite('pod', this.dim);
    // state: 0 armoured, 1 exposed, 2 destroyed
    this.pods = ARMS.map(() => ({ hp: POD_HP, state: 0, flash: 0, x: 0, y: 0, ex: 0, ey: 0 }));
    this.active = -1;
    this.openT = 1.5;
    this.phase = 'rise';      // rise -> fight <-> stunned -> dying
    this.phaseT = 0;
    this.spitT = 5;
    this.roar = 0;
    this.part = -2;           // what the crosshair is on: pod index, -1 for the body, -2 for nothing
    this.ps = 0;
    scanner.say('bossRise', true);
    play('roar', this.p.pan);
  }

  counts() { return false; }

  place() {
    dirFromBearing(this.yaw, this.pitch, this.dir);
    project(this.dir, this.p);
    this.scale = (UNIT / this.r) * view.f;
    this.on = this.p.front;
  }

  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.roar > 0) this.roar -= dt;
    for (const pod of this.pods) if (pod.flash > 0) pod.flash -= dt;

    if (this.phase === 'rise') {
      if (this.phaseT > RISE) this.setPhase('fight');
    } else if (this.phase === 'fight') {
      if (this.active < 0) {
        this.openT -= dt;
        if (this.openT <= 0) this.expose();
      }
      this.spitT -= dt;
      if (this.spitT <= 0) this.spit(2);
    } else if (this.phase === 'stunned') {
      if (this.phaseT > STUN) this.recover();
    } else if (this.phaseT > DEATH) {
      this.dead = true;
      if (this.p.front) this.game.fx.burst(this.p.x, this.p.y, DIMS[this.dim].ramp, 60, 160, 3);
      this.game.fx.white = 0.4;
    }
    this.place();
    this.layout();
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseT = 0;
  }

  // Positions of the moving parts in screen space, shared by drawing and hit testing.
  layout() {
    const t = this.t, stunned = this.phase === 'stunned';
    const rise = this.phase === 'rise' ? Math.min(1, this.phaseT / RISE) : 1;
    const fade = this.phase === 'dying' ? Math.max(0, 1 - this.phaseT / DEATH) : 1;
    const s = this.ps = this.scale * rise * fade;
    const sway = stunned ? 0.25 : 1;
    this.cx = this.p.x;
    this.cy = this.p.y + (1 - rise) * 20 * this.scale + (stunned ? 4 * s : 0) + Math.sin(t * 1.7) * 1.5 * s * sway;
    ARMS.forEach((a, i) => {
      const pod = this.pods[i];
      pod.ex = a.ex + Math.sin(t * 1.3 + i * 2.1) * 4 * sway;
      pod.ey = a.ey + Math.cos(t * 1.1 + i * 1.7) * 3 * sway + (stunned ? 16 : 0);
      pod.x = this.cx + pod.ex * s;
      pod.y = this.cy + pod.ey * s;
    });
  }

  expose() {
    const i = this.pods.findIndex(p => p.state === 0);
    if (i < 0) return;
    this.active = i;
    this.pods[i].state = 1;
    scanner.say('bossWeak', true);
  }

  spit(n) {
    this.spitT = 8;
    this.roar = 0.8;
    this.rift.send(n, 'spawnling');
  }

  aimed(tolPx) {
    this.part = -2;
    if (!this.p.front || this.phase === 'rise' || this.phase === 'dying') return false;
    const reach = (pod) => Math.hypot(pod.x - view.cx, pod.y - view.cy) - 6 * this.ps;
    // The exposed pod wins any tie: a near miss on it should not count as armour.
    if (this.active >= 0 && reach(this.pods[this.active]) < tolPx) this.part = this.active;
    else {
      let best = tolPx;
      this.pods.forEach((pod, i) => { const d = reach(pod); if (d < best) { best = d; this.part = i; } });
      if (this.part === -2 && Math.hypot(this.cx - view.cx, this.cy - view.cy) < 14 * this.ps + tolPx) this.part = -1;
    }
    return this.part !== -2;
  }

  hit() {
    const pod = this.pods[this.part], ramp = DIMS[this.dim].ramp;
    if (this.phase !== 'fight' || this.part !== this.active || !pod) {
      play('armour', this.p.pan);
      if (this.phase === 'fight') scanner.say('bossArmour');
      this.flash = 0.06;
      return;
    }
    pod.hp--;
    this.hp--;
    pod.flash = 0.1;
    play('hit', this.p.pan);
    this.game.fx.burst(pod.x, pod.y, ramp, 4, 50);
    if (pod.hp > 0) return;

    pod.state = 2;
    this.active = -1;
    this.openT = 1.5;
    play('podbreak', this.p.pan);
    this.game.fx.burst(pod.x, pod.y, ['#ffd23f', '#f4f4f4', ramp[2]], 26, 100, 2);
    if (this.pods.every(p => p.state === 2)) {
      // Stunned: the only window in which the rift will seal.
      this.setPhase('stunned');
      this.rift.bossLock = false;
      play('stun', this.p.pan);
      scanner.say('bossStun', true);
    } else {
      play('roar', this.p.pan);
      scanner.say('bossPod', true);
      this.spit(3);
    }
  }

  // Not sealed in time: it gets up and regrows one weak point.
  recover() {
    this.setPhase('fight');
    this.rift.bossLock = true;
    const pod = this.pods[2];
    pod.hp = POD_HP;
    pod.state = 0;
    this.hp = POD_HP;
    this.openT = 1;
    this.spitT = 3;
    this.roar = 0.8;
    play('roar', this.p.pan);
    scanner.say('bossRecover', true);
  }

  // Its rift closing is what finishes it.
  onRiftSealed() {
    this.setPhase('dying');
    this.game.onKill(this);
    play('roar', this.p.pan);
  }

  die() {}

  draw() {
    const s = this.ps, t = this.t;
    if (!this.p.front || s < 0.05) return;
    const { cx, cy } = this;
    ARMS.forEach((a, i) => {
      const pod = this.pods[i];
      for (let j = 0; j < SEGS; j++) {
        const u = j / SEGS, wob = Math.sin(t * 2.2 + u * 3 + i) * 3 * u;
        blit(this.segS.frames[0],
          cx + (a.ax + (pod.ex - a.ax) * u + a.nx * wob) * s,
          cy + (a.ay + (pod.ey - a.ay) * u + a.ny * wob) * s,
          s * (1 - u * 0.25));
      }
    });
    blit((this.flash > 0 ? this.sprite.flash : this.sprite.frames)[0], cx, cy, s);
    const open = this.roar > 0 ? 6 : this.phase === 'stunned' ? 5 : 2 + Math.sin(t * 3) * 1.5;
    blit(this.jawS.frames[0], cx, cy + (12 + open) * s, s);
    for (const pod of this.pods) {
      const frames = pod.flash > 0 ? this.podS.flash : this.podS.frames;
      blit(frames[pod.state], pod.x, pod.y, s * (pod.state === 1 ? 1 + Math.sin(t * 8) * 0.12 : 1));
    }
  }
}
