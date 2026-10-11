// Glomm (Ulta-9, violet): clings to the edge of its rift and pulls it wider until shot.
// Once the rift is fully open it lets go and comes on in hops, zig-zagging from one to the next.

import { REACH_DIST, RIFT_DIST, level } from '../config.js';
import { DEG, view } from '../projection.js';
import { scanner } from '../scanner.js';
import { Creature } from './base.js';

const HOP = 1.15, AIR = 0.4;      // seconds per hop, and the fraction of it spent in the air

export class Glomm extends Creature {
  static def = { sprite: 'glomm', size: 1.5, hp: 2, damage: 8, emerge: 1.3 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.side = rift.glommSide = -(rift.glommSide || 1);   // alternate edges
    this.clinging = false;
    this.hopT = 0;
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
    // Hopping: a leap forward and to one side, a pause, then a leap to the other side.
    this.hopT += dt;
    const hop = Math.floor(this.hopT / HOP), u = (this.hopT % HOP) / HOP;
    this.ground = (this.ground ?? this.pitch) * (1 - 0.3 * dt);
    this.air = u < AIR;
    if (this.air) {
      this.r -= 1.9 * (this.elite ? 1.2 : 1) * level.speed * dt;
      this.baseYaw += (hop % 2 ? 1 : -1) * 16 * DEG * dt;
    }
    this.yaw = this.baseYaw;
    this.pitch = this.ground + (this.air ? Math.sin((u / AIR) * Math.PI) * 5 * DEG : 0);
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return this.clinging ? (this.t * 5) | 0 : this.air ? 1 : 0; }
}
