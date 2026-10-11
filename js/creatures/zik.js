// Zik (Vesh, acid green): tiny, fast and erratic. It barely hurts; it is just hard to hit.

import { REACH_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { clamp, rand } from '../util.js';
import { Creature } from './base.js';

export class Zik extends Creature {
  static def = { sprite: 'zik', size: 0.5, hp: 1, damage: 1, emerge: 0.5 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.speed = rand(2, 2.6) * (this.elite ? 1.15 : 1) * level.speed;
    this.jx = 0;
    this.jy = 0;
    this.vx = 0;
    this.vy = 0;
    this.turnT = 0;
  }

  behave(dt) {
    this.r -= this.speed * dt;
    // It darts: a new sideways heading every fraction of a second.
    if ((this.turnT -= dt) <= 0) {
      this.turnT = rand(0.25, 0.6);
      this.vx = rand(-55, 55) * DEG;
      this.vy = rand(-20, 20) * DEG;
    }
    this.jx = clamp(this.jx + this.vx * dt, -32 * DEG, 32 * DEG);
    this.jy = clamp(this.jy + this.vy * dt, -10 * DEG, 10 * DEG);
    this.yaw = this.rift.yaw + this.jx;
    this.pitch = this.rift.pitch * (1 - 0.5 * this.progress) + this.jy;
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return (this.t * 12) | 0; }
}
