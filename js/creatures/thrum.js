// Thrum (Miridian, amber): aggressive but easy to stop. It paws the ground in front of its
// rift, flashing, then charges in a straight line. Big target, one shot, if the player is quick.

import { REACH_DIST, level } from '../config.js';
import { DEG } from '../projection.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { Creature } from './base.js';

export class Thrum extends Creature {
  static def = { sprite: 'thrum', size: 1.5, hp: 1, damage: 9, emerge: 0.9 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.wind = 1.2 * level.patience;       // seconds of warning before it goes
  }

  emerged() {
    play('windup', this.p.pan);
    scanner.say('thrum');
  }

  behave(dt) {
    if (this.wind > 0) {
      this.wind -= dt;
      this.yaw = this.rift.yaw + Math.sin(this.t * 40) * 0.4 * DEG;
      if (((this.t * 12) | 0) & 1) this.flash = 0.03;
      return;
    }
    this.r -= 4.5 * (this.elite ? 1.15 : 1) * level.speed * dt;
    this.yaw = this.rift.yaw;
    this.pitch = this.rift.pitch * (1 - this.progress);
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return this.wind > 0 ? 0 : 1; }
}
