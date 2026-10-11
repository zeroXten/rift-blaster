// Shared creature behaviour: squeezing out of a rift, being projected and drawn as a scaled
// flat sprite, taking hits, dying. Each creature file overrides behave() and little else.

import { REACH_DIST, RIFT_DIST } from '../config.js';
import { dirFromBearing, onScreen, project, view } from '../projection.js';
import { blit } from '../render.js';
import { DIMS, getSprite } from '../sprites.js';
import { drawBulge } from '../rift.js';
import { play } from '../audio/sfx.js';

export class Creature {
  // sprite, size (world units tall), hp, damage (integrity lost when it reaches the player), emerge (seconds)
  static def = { sprite: 'yrrk', size: 1, hp: 1, damage: 4, emerge: 1 };

  constructor(game, rift, o = {}) {
    const d = this.def = this.constructor.def;
    this.game = game;
    this.rift = rift;
    this.dim = rift.dim;
    this.elite = !!o.elite;                     // came through a full breach: tougher and larger
    this.hp = d.hp + (this.elite ? 1 : 0);
    this.size = d.size * (this.elite ? 1.2 : 1);
    this.sprite = getSprite(d.sprite, this.dim);

    this.yaw = rift.yaw;
    this.pitch = rift.pitch;
    this.r = RIFT_DIST - 0.1;                   // distance from the player
    this.state = 'emerge';                      // emerge -> active -> dying
    this.e = 0;                                 // emergence progress, 0 to 1
    this.t = Math.random() * 10;
    this.seed = Math.random() * 6.28;
    this.flash = 0;
    this.dieT = 0;
    this.dead = false;

    this.dir = [0, 0, 0];
    this.p = {};
    this.scale = 1;
    this.on = false;
    this.place();
  }

  // Project onto the screen. `on` means some of the sprite is actually visible.
  place() {
    dirFromBearing(this.yaw, this.pitch, this.dir);
    const p = project(this.dir, this.p);
    this.scale = (this.size / this.r) * view.f / this.sprite.h;
    this.on = onScreen(p, this.sprite.w * this.scale / 2, this.sprite.h * this.scale / 2, 6);
  }

  // Whether this creature counts toward its rift's population cap.
  counts() { return true; }

  // Fraction of the way from the rift to the player.
  get progress() { return 1 - (this.r - REACH_DIST) / (RIFT_DIST - REACH_DIST); }

  update(dt) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'emerge') {
      this.rift.emerging++;
      this.e += dt / this.def.emerge;
      // Out: it pops into full colour with a flash, and can now be shot.
      if (this.e >= 1) { this.state = 'active'; this.flash = 0.1; this.emerged(); }
    } else if (this.state === 'active') {
      this.behave(dt);
    } else if (this.state === 'dying') {
      // Squash, then break apart.
      this.dieT += dt;
      if (this.dieT > 0.16) {
        this.dead = true;
        const px = this.sprite.h * this.scale;
        if (this.p.front) this.game.fx.burst(this.p.x, this.p.y, DIMS[this.dim].ramp, 10 + ((this.size * 8) | 0), 30 + px * 1.5, Math.max(1, Math.min(4, this.scale | 0)));
      }
    }
    if (this.state !== 'dying' && this.counts()) this.rift.alive++;
    this.place();
  }

  emerged() {}
  behave() {}

  // Is the crosshair on this creature? tolPx is the weapon's tolerance in pixels. A creature
  // still squeezing through cannot be targeted: the rift swallows shots aimed into it.
  aimed(tolPx) {
    if (this.state !== 'active' || !this.p.front) return false;
    return Math.hypot(this.p.x - view.cx, this.p.y - view.cy) < Math.max(3, this.sprite.w * this.scale * 0.4) + tolPx;
  }

  hit() {
    this.flash = 0.12;
    if (--this.hp <= 0) this.die(true);
    else play('hit', this.p.pan);
  }

  die(killed) {
    if (this.state === 'dying') return;
    this.state = 'dying';
    this.dieT = 0;
    if (killed) {
      this.rift.kills++;
      play('kill_' + this.def.sprite, this.p.pan);
      this.game.onKill(this);
    }
  }

  // Reached the player.
  reach() {
    this.game.damage(this.def.damage, this);
    this.dead = true;
  }

  frame() { return (this.t * 4) | 0; }

  draw() {
    const p = this.p;
    if (!p.front) return;
    let sx = this.scale, sy = this.scale;
    if (this.state === 'emerge') {
      if (this.e < 0.5) {
        drawBulge(this.rift.p.x, this.rift.p.y, this.rift.hw, this.e, this.t, DIMS[this.dim].ramp, this.seed);
        return;
      }
      const k = (this.e - 0.5) * 2;
      sx *= k * (0.5 + 0.5 * k);                // squeezing through: narrow first
      sy *= k;
    } else if (this.state === 'dying') {
      const k = this.dieT / 0.16;
      sx *= 1 + k * 0.7;
      sy *= 1 - k * 0.75;
    } else if (!this.def.still) {
      const b = Math.sin(this.t * 6) * 0.05;
      sx *= 1 + b;
      sy *= 1 - b;
    }
    // Still inside the rift it is only a shadow in the rift's colour.
    const frames = this.state === 'emerge' ? this.sprite.shade : this.flash > 0 ? this.sprite.flash : this.sprite.frames;
    blit(frames[this.frame() % frames.length], p.x, p.y, sx, sy);
  }
}
