// Brakk (Ulta-9, violet): slow, armoured and patient. It trudges in on a wide zig-zag, takes
// five shots, and each one only shoves it back a step, but it hurts badly if it arrives.

import { REACH_DIST, RIFT_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { rand } from '../util.js';
import { Creature } from './base.js';

export class Brakk extends Creature {
  static def = { sprite: 'brakk', size: 1.9, hp: 5, damage: 12, emerge: 1.8, still: true };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.offYaw = rand(-12, 12) * DEG;
    this.ph = Math.random() * 6.28;
    this.stepT = 0;
  }

  emerged() { scanner.say('brakk'); }

  behave(dt) {
    this.r -= 0.5 * level.speed * this.flank * dt;
    const k = this.progress;
    this.yaw = this.rift.yaw + this.offYaw * k + Math.sin(this.t * 0.8 + this.ph) * 13 * DEG * Math.min(1, k * 4);
    this.pitch = this.rift.pitch * (1 - k);
    if ((this.stepT -= dt) <= 0) { this.stepT = 0.9; play('step', this.p.pan, 0.9); }
    if (this.r <= REACH_DIST) this.reach();
  }

  hit() {
    super.hit();
    this.r = Math.min(RIFT_DIST - 0.3, this.r + 0.35);
  }

  frame() { return (this.t * 2.2) | 0; }
}
