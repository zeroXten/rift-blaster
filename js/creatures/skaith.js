// Skaith (The Hollow, cold white): only moves while outside the player's view. Shooting it
// makes it flicker a step to one side and a little closer, so its three shots take three aims.

import { REACH_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { DIMS } from '../sprites.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { clamp, rand } from '../util.js';
import { Creature } from './base.js';

export class Skaith extends Creature {
  static def = { sprite: 'skaith', size: 2.6, hp: 3, damage: 12, emerge: 1.6, still: true };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.offYaw = rand(-30, 30) * DEG;
    this.speed = 1.3 * (this.elite ? 1.2 : 1) * level.speed;
    this.pose = 0;
    this.moved = false;
    this.stepT = 0;
    this.shift = 0;
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
    this.yaw = this.rift.yaw + this.offYaw * k + this.shift;
    this.pitch = this.rift.pitch * (1 - 0.7 * k);
    // Footsteps, panned and louder as it closes: the only warning from behind.
    this.stepT -= dt;
    if (this.stepT <= 0) { this.stepT = 0.4; play('step', this.p.pan, clamp(1.3 - this.r / 10, 0.3, 1)); }
    if (this.r <= REACH_DIST + 0.3) this.reach();
  }

  hit() {
    super.hit();
    if (this.state !== 'active') return;
    if (this.p.front) this.game.fx.burst(this.p.x, this.p.y, DIMS[this.dim].ramp, 10, 50);
    const d = (Math.random() < 0.5 ? -1 : 1) * rand(10, 16) * DEG;
    this.shift += d;
    this.yaw += d;
    this.r = Math.max(REACH_DIST + 0.5, this.r - 0.5);
    this.pose = 1 - this.pose;
  }

  frame() { return this.pose; }
}
