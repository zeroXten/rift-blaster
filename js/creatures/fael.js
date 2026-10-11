// Fael (The Hollow, cold white): barely dangerous but hard to zap. It drifts in on a wide
// swing and is only solid about half the time; while it is a flickering shadow, shots pass
// straight through it.

import { REACH_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { rand } from '../util.js';
import { Creature } from './base.js';

const CYCLE = 2.4, SOLID = 1.1;

export class Fael extends Creature {
  static def = { sprite: 'fael', size: 1.3, hp: 1, damage: 2, emerge: 1.0 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.swing = rand(18, 28) * DEG;
    this.ph = Math.random() * 6.28;
    this.ghost = false;
  }

  behave(dt) {
    this.ghost = this.t % CYCLE > SOLID;
    this.r -= 0.55 * level.speed * dt;
    const k = this.progress;
    this.yaw = this.rift.yaw + Math.sin(this.t * 0.9 + this.ph) * this.swing * Math.min(1, k * 3 + 0.2);
    this.pitch = this.rift.pitch * (1 - 0.5 * k) + Math.sin(this.t * 1.3 + this.ph) * 4 * DEG;
    if (this.r <= REACH_DIST) this.reach();
  }

  aimed(tolPx) { return !this.ghost && super.aimed(tolPx); }

  draw() {
    if (this.ghost && this.state === 'active' && ((this.t * 15) | 0) & 1) return;
    super.draw();
  }
}
