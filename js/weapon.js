// Aiming, firing, heat, and sealing by gaze.

import { BEAM_TOL, HEAT_DECAY, HEAT_PER_SHOT, OVERHEAT_LOCK, SEAL_ANGLE, SEAL_TIME } from './config.js';
import { DEG, angleTo, view } from './projection.js';
import { play, sealTone } from './audio/sfx.js';
import { scanner } from './scanner.js';
import { vibrate } from './util.js';

export class Weapon {
  // up: upgrade levels { cool, beam, seal }
  constructor(up) {
    this.decay = HEAT_DECAY * (1 + 0.35 * up.cool);
    this.tol = (BEAM_TOL + 1.5 * up.beam) * DEG;
    this.sealTime = Math.max(0.8, SEAL_TIME - 0.35 * up.seal);
    this.tolPx = 0;
    this.heat = 0;
    this.lock = 0;          // seconds of overheat lockout left
    this.kick = 0;
    this.target = null;     // creature under the crosshair
    this.rift = null;       // rift under the crosshair
    this.seal = 0;          // 0 to 1
    this.grace = 0;
  }

  // The nearest creature the crosshair is on. Hits are tested by angle from the view direction:
  // on screen that is distance from the centre, with a generous tolerance because the player
  // aims with their whole body.
  pick(game) {
    let best = null;
    for (const c of game.creatures) if (c.aimed(this.tolPx) && (!best || c.r < best.r)) best = c;
    return best;
  }

  update(dt, game) {
    this.tolPx = view.f * Math.tan(this.tol);
    this.kick -= dt;
    if (this.lock > 0) {
      this.lock -= dt;
      this.heat = Math.max(0, (100 * this.lock) / OVERHEAT_LOCK);
    } else {
      this.heat = Math.max(0, this.heat - this.decay * dt);
    }
    game.fx.steam = this.lock > 0;
    this.target = this.pick(game);

    // Sealing: progress builds while an unblocked rift stays near the centre. Looking away resets it.
    let near = null, nearA = Infinity;
    for (const r of game.rifts) {
      if (r.sealed) continue;
      const a = angleTo(r.dir);
      if (a < SEAL_ANGLE * DEG * (r.size > 1 ? 1.6 : 1) && a < nearA) { near = r; nearA = a; }
    }
    if (near && near === this.rift) {
      this.grace = 0.15;
      if (near.blocked) {
        game.emit(near.locked ? 'locked' : 'blocked');
        if (near.locked && !near.bossLock) scanner.say('locked');
      }
      else {
        this.seal += dt / this.sealTime;
        if (this.seal >= 1) { near.seal(); this.rift = null; this.seal = 0; }
      }
    } else if ((this.grace -= dt) <= 0) {
      this.rift = near;
      this.seal = 0;
      this.grace = 0.15;
    }
    sealTone(this.rift && !this.rift.blocked ? this.seal : 0);
  }

  fire(game) {
    if (this.lock > 0) { play('denied'); return; }
    game.stats.shots++;
    this.heat += HEAT_PER_SHOT;
    this.kick = 0.08;
    play('shot');
    const c = this.pick(game);
    game.fx.shot(!!c);
    if (c) {
      game.stats.hits++;
      game.misses = 0;
      c.hit();
      vibrate(15);
    } else if (++game.misses >= 4) {
      game.misses = 0;
      scanner.say('miss');
    }
    if (this.heat >= 100) {
      this.heat = 100;
      this.lock = OVERHEAT_LOCK;
      play('overheat');
      scanner.say('overheat', true);
      vibrate(200);
    }
  }
}
