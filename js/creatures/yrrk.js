// Yrrk (Vesh, acid green): small, arrives in groups, drifts toward the player.

import { REACH_DIST } from '../config.js';
import { DEG } from '../projection.js';
import { rand } from '../util.js';
import { Creature } from './base.js';

export class Yrrk extends Creature {
  static def = { sprite: 'yrrk', size: 0.9, hp: 1, damage: 3, emerge: 1.0 };

  constructor(game, rift, o) {
    super(game, rift, o);
    // Each one fans out from the rift on its own line so a pack cannot be shot as one target.
    this.offYaw = rand(-22, 22) * DEG;
    this.offPitch = rand(-12, 12) * DEG;
    this.speed = rand(0.85, 1.25) * (this.elite ? 1.2 : 1);
    this.ph = Math.random() * 6.28;
  }

  behave(dt) {
    this.r -= this.speed * dt;
    const k = this.progress, e = k * (2 - k);
    this.yaw = this.rift.yaw + this.offYaw * e + Math.sin(this.t * 2.1 + this.ph) * 1.5 * DEG;
    this.pitch = this.rift.pitch * (1 - 0.5 * e) + this.offPitch * e + Math.sin(this.t * 3.3 + this.ph) * 1.2 * DEG;
    if (this.r <= REACH_DIST) this.reach();
  }
}

// What the Ummagog spits: Yrrk-shaped, red, faster out of the rift.
export class Spawnling extends Yrrk {
  static def = { sprite: 'spawnling', size: 0.8, hp: 1, damage: 3, emerge: 0.8 };
}
