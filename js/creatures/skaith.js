// Skaith (The Hollow, cold white): only moves while outside the player's view.

import { REACH_DIST } from '../config.js';
import { DEG } from '../projection.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { clamp, rand } from '../util.js';
import { Creature } from './base.js';

export class Skaith extends Creature {
  static def = { sprite: 'skaith', size: 2.6, hp: 3, damage: 10, emerge: 1.6, still: true };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.offYaw = rand(-30, 30) * DEG;
    this.speed = 1.3 * (this.elite ? 1.2 : 1);
    this.pose = 0;
    this.moved = false;
    this.stepT = 0;
  }

  emerged() { scanner.say('skaith'); }

  behave(dt) {
    if (this.on) {
      // Seen: frozen. If it moved since last time, it is found in a different pose.
      if (this.moved) { this.moved = false; this.pose = (Math.random() * 2) | 0; }
      return;
    }
    this.moved = true;
    this.r -= this.speed * dt;
    const k = this.progress;
    this.yaw = this.rift.yaw + this.offYaw * k;
    this.pitch = this.rift.pitch * (1 - 0.7 * k);
    // Footsteps, panned and louder as it closes: the only warning from behind.
    this.stepT -= dt;
    if (this.stepT <= 0) { this.stepT = 0.4; play('step', this.p.pan, clamp(1.3 - this.r / 10, 0.3, 1)); }
    if (this.r <= REACH_DIST + 0.3) this.reach();
  }

  frame() { return this.pose; }
}
