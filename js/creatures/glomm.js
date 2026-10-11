// Glomm (Ulta-9, violet): clings to the edge of its rift and pulls it wider until shot.
// Once the rift is fully open it lets go and crawls toward the player.

import { REACH_DIST, RIFT_DIST } from '../config.js';
import { DEG, view } from '../projection.js';
import { scanner } from '../scanner.js';
import { Creature } from './base.js';

export class Glomm extends Creature {
  static def = { sprite: 'glomm', size: 1.5, hp: 2, damage: 6, emerge: 1.3 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.side = rift.glommSide = -(rift.glommSide || 1);   // alternate edges
    this.clinging = false;
    this.ph = Math.random() * 6.28;
  }

  emerged() {
    this.clinging = true;
    scanner.say('glomm');
  }

  counts() { return this.state === 'emerge' || this.clinging; }

  behave(dt) {
    const rift = this.rift;
    if (this.clinging) {
      if (rift.sealed || rift.width >= 0.97) {
        this.clinging = false;
        this.baseYaw = this.yaw;
        return;
      }
      // Holding the rift open: it widens faster and cannot be sealed.
      rift.clingers++;
      rift.pull++;
      const off = Math.atan((rift.hw + this.sprite.w * this.scale * 0.3) / view.f);
      this.yaw = rift.yaw + (this.side * off) / Math.cos(rift.pitch) + Math.sin(this.t * 9) * 0.15 * DEG;
      this.pitch = rift.pitch + Math.sin(this.t * 4.5 + this.ph) * 0.4 * DEG;
      this.r = RIFT_DIST - 0.2;
      return;
    }
    this.r -= 0.75 * (this.elite ? 1.2 : 1) * dt;
    this.yaw = this.baseYaw + Math.sin(this.t * 1.3 + this.ph) * 5 * DEG * this.progress;
    this.pitch -= this.pitch * 0.25 * dt;
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return (this.t * (this.clinging ? 5 : 2.5)) | 0; }
}
