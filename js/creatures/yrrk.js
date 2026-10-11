// Yrrk (Vesh, acid green): small, arrives in groups, drifts toward the player.

import { REACH_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { rand } from '../util.js';
import { Creature } from './base.js';

export class Yrrk extends Creature {
  static def = { sprite: 'yrrk', size: 0.9, hp: 1, damage: 2, emerge: 0.8 };

  constructor(game, rift, o) {
    super(game, rift, o);
    // Each one bursts out on its own line and weaves, so a pack cannot be shot as one target.
    this.offYaw = rand(-30, 30) * DEG;
    this.offPitch = rand(-9, 9) * DEG;
    this.speed = rand(1.1, 1.6) * (this.elite ? 1.2 : 1) * level.speed;
    this.weave = rand(3, 7) * DEG;
    this.ph = Math.random() * 6.28;
  }

  behave(dt) {
    this.r -= this.speed * dt;
    const k = this.progress, e = Math.min(1, k * 3);
    this.yaw = this.rift.yaw + this.offYaw * e + Math.sin(this.t * 2.1 + this.ph) * this.weave * e;
    this.pitch = this.rift.pitch * (1 - 0.5 * e) + this.offPitch * e + Math.sin(this.t * 3.3 + this.ph) * 1.2 * DEG;
    if (this.r <= REACH_DIST) this.reach();
  }
}

// What the Ummagog spits: Yrrk-shaped, red, faster out of the rift.
export class Spawnling extends Yrrk {
  static def = { sprite: 'spawnling', size: 0.8, hp: 1, damage: 2, emerge: 0.8 };
}
