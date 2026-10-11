// Ootheen (Miridian, amber): a single eye that hovers and glares. Keep the crosshair on it
// for more than 0.8 seconds and it jumps somewhere else.

import { PITCH_LIMIT } from '../config.js';
import { DEG, wrapAngle } from '../projection.js';
import { DIMS } from '../sprites.js';
import { play } from '../audio/sfx.js';
import { scanner } from '../scanner.js';
import { clamp, rand } from '../util.js';
import { Creature } from './base.js';

const JUMP_AFTER = 0.8, GLARE_EVERY = 6, GLARE_CHARGE = 1.1;

export class Ootheen extends Creature {
  static def = { sprite: 'ootheen', size: 1.2, hp: 1, damage: 3, emerge: 1.2 };

  constructor(game, rift, o) {
    super(game, rift, o);
    this.hoverR = rand(5.5, 7);
    this.held = 0;
    this.glareT = rand(4, 6);
    this.charging = false;
    this.blink = 0;
  }

  emerged() {
    this.baseYaw = this.rift.yaw + rand(-18, 18) * DEG;
    this.basePitch = clamp(this.rift.pitch + rand(-10, 10) * DEG, -PITCH_LIMIT * DEG, PITCH_LIMIT * DEG);
    scanner.say('ootheen');
  }

  behave(dt) {
    const ease = Math.min(1, dt * 3);
    this.r += (this.hoverR - this.r) * Math.min(1, dt * 1.5);
    this.yaw += wrapAngle(this.baseYaw - this.yaw) * ease;
    this.pitch += (this.basePitch + Math.sin(this.t * 1.7) * 1.5 * DEG - this.pitch) * ease;
    if (this.blink > 0) this.blink -= dt;

    if (this.aimed(this.game.weapon.tolPx)) {
      this.held += dt;
      if (this.held > JUMP_AFTER) this.jump();
    } else {
      this.held = Math.max(0, this.held - dt * 2);
    }

    // The glare: a visible, audible wind-up, then it hurts wherever the player is looking.
    this.glareT -= dt;
    if (this.glareT < GLARE_CHARGE && !this.charging) { this.charging = true; play('glare', this.p.pan); }
    if (this.glareT <= 0) {
      this.charging = false;
      this.glareT = GLARE_EVERY;
      if (this.on) this.game.fx.zap(this.p.x, this.p.y);
      this.game.damage(this.def.damage, this);
    }
  }

  jump() {
    if (this.p.front) this.game.fx.burst(this.p.x, this.p.y, DIMS[this.dim].ramp, 8, 40);
    this.baseYaw = this.yaw + (Math.random() < 0.5 ? -1 : 1) * rand(28, 60) * DEG;
    this.basePitch = rand(-12, 12) * DEG;
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    this.held = 0;
    this.blink = 0.3;
    play('jump', this.p.pan);
    scanner.say('ootheenJump');
  }

  frame() { return this.blink > 0 ? 2 : this.charging ? 1 : 0; }

  draw() {
    // Flickers when it is about to jump.
    if (this.held > 0.45 && ((this.t * 20) | 0) & 1) this.flash = 0.02;
    super.draw();
  }
}
