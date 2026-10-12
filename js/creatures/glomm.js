// Glomm (Ulta-9, violet): clings to the edge of its rift and pulls it wider until shot, and
// spits at the player while it is there. The spit can be shot out of the air.
// Once the rift is fully open it lets go and comes on in hops, zig-zagging from one to the next.

import { MAX_CREATURES, REACH_DIST, RIFT_DIST, level } from '../config.js';
import { DEG, view } from '../projection.js';
import { play } from '../audio/sfx.js';
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
    this.spitT = level.spit * 0.6;
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
      // It flashes just before it spits.
      if (level.spit && this.game.creatures.length < MAX_CREATURES - 2) {
        this.spitT -= dt;
        if (this.spitT < 0.4 && ((this.t * 14) | 0) & 1) this.flash = 0.03;
        if (this.spitT <= 0) {
          this.spitT = level.spit;
          this.game.spawn('glob', rift, { from: this });
          play('spit', this.p.pan);
        }
      }
      return;
    }
    // Hopping: a leap forward and to one side, a pause, then a leap to the other side.
    this.hopT += dt;
    const hop = Math.floor(this.hopT / HOP), u = (this.hopT % HOP) / HOP;
    this.ground = (this.ground ?? this.pitch) * (1 - 0.3 * dt);
    this.air = u < AIR;
    if (this.air) {
      this.r -= 1.9 * (this.elite ? 1.2 : 1) * level.speed * this.flank * dt;
      this.baseYaw += (hop % 2 ? 1 : -1) * 16 * DEG * dt;
    }
    this.yaw = this.baseYaw;
    this.pitch = this.ground + (this.air ? Math.sin((u / AIR) * Math.PI) * 5 * DEG : 0);
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return this.clinging ? (this.t * 5) | 0 : this.air ? 1 : 0; }
}

// What a Glomm spits: a small glob lobbed at the player. One shot bursts it.
export class Glob extends Creature {
  static def = { sprite: 'glob', size: 0.55, hp: 1, damage: 5, emerge: 0.1, minor: true };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.state = 'active';
    this.e = 1;
    this.yaw = o.from.yaw;
    this.base = o.from.pitch;
    this.r = this.far = o.from.r - 0.3;
    this.place();
  }

  counts() { return false; }

  behave(dt) {
    this.r -= 2.6 * level.speed * dt;
    // A shallow arc: up from the Glomm, then down onto the player.
    const k = 1 - (this.r - REACH_DIST) / (this.far - REACH_DIST);
    this.pitch = this.base * (1 - k) + Math.sin(k * Math.PI) * 6 * DEG;
    if (this.r <= REACH_DIST) this.reach();
  }

  frame() { return (this.t * 10) | 0; }
}
