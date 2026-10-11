// Aiming, firing, heat, and sealing. Firing and sealing are separate actions on separate
// buttons: FIRE shoots creatures, SEAL is held on a weakened rift to close it.

import { BEAM_TOL, HEAT_DECAY, HEAT_PER_SHOT, OVERHEAT_LOCK, SEAL_ANGLE, SEAL_TIME, level } from './config.js';
import { DEG, angleTo, view } from './projection.js';
import { DIMS } from './sprites.js';
import { play, sealTone } from './audio/sfx.js';
import { scanner } from './scanner.js';
import { vibrate } from './util.js';

export class Weapon {
  constructor() {
    this.retune();
    this.tolPx = 0;
    this.heat = 0;
    this.lock = 0;          // seconds of overheat lockout left
    this.kick = 0;
    this.auto = 0;          // seconds until rapid fire's next shot
    this.swallowed = 0;     // seconds left of the "no effect" notice after firing into a rift
    this.target = null;     // creature under the crosshair
    this.rift = null;       // rift under the crosshair
    this.seal = 0;          // 0 to 1
    this.grace = 0;
  }

  // Takes the aiming tolerance and seal time from the level now in force.
  retune() {
    this.tol = (BEAM_TOL + level.tol) * DEG;
    this.sealTime = SEAL_TIME * level.seal;
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
    this.swallowed -= dt;
    if (this.lock > 0) {
      this.lock -= dt;
      this.heat = Math.max(0, (100 * this.lock) / OVERHEAT_LOCK);
    } else {
      this.heat = Math.max(0, this.heat - HEAT_DECAY * dt);
    }
    game.fx.steam = this.lock > 0;
    // Rapid fire: no heat, and holding the fire button keeps firing.
    if (game.rapid > 0 && game.trigger && !game.ending && (this.auto -= dt) <= 0) this.fire(game);
    this.target = this.pick(game);

    // Sealing: while SEAL is held and a weakened, unblocked rift stays near the centre,
    // progress builds. Letting go or looking away loses it.
    let near = null, nearA = Infinity;
    for (const r of game.rifts) {
      if (r.sealed) continue;
      const a = angleTo(r.dir);
      if (a < SEAL_ANGLE * level.sealAngle * DEG * (r.size > 1 ? 1.6 : 1) && a < nearA) { near = r; nearA = a; }
    }
    if (near && near === this.rift) {
      this.grace = 0.15;
      if (!game.sealing) this.seal = 0;
      else if (near.blocked) {
        game.emit(near.locked ? 'locked' : 'blocked');
        if (near.locked && !near.bossLock) scanner.say('locked');
      } else {
        this.seal += dt / this.sealTime;
        if (this.seal >= 1) { near.seal(); this.rift = null; this.seal = 0; }
      }
    } else if ((this.grace -= dt) <= 0) {
      this.rift = near;
      this.seal = 0;
      this.grace = 0.15;
    }
    const working = game.sealing && this.rift && !this.rift.blocked;
    game.fx.sealing = working ? Math.max(0.01, this.seal) : 0;
    sealTone(working ? this.seal : 0);
  }

  // Rapid fire: taking the power-up also clears any overheat.
  cool() {
    this.heat = 0;
    this.lock = 0;
  }

  fire(game) {
    if (this.lock > 0) { play('denied'); return; }
    const rapid = game.rapid > 0;
    if (!rapid) this.heat += HEAT_PER_SHOT * level.heat;
    this.kick = 0.08;
    this.auto = 0.11;
    play('shot');
    // In order: a creature out in the open, a power-up, then a rift. A rift's energy swallows
    // the shot, which does nothing to it or to whatever is still inside, unless a rift charge
    // is loaded, in which case that one shot closes it.
    const c = this.pick(game);
    const item = c ? null : game.pickups.find(p => p.aimed(this.tolPx));
    const rift = c || item ? null : game.rifts.find(r => r.covers(this.tolPx));
    const charged = rift && game.charge && !rift.def.boss;
    game.fx.shot(c || item || charged ? 'hit' : rift ? 'absorb' : 'miss', rapid ? 0 : this.heat, rift && DIMS[rift.dim].ramp);
    if (rift && !charged) {
      rift.absorb();
      this.swallowed = 0.7;
      scanner.say('absorbed');
      game.emit('absorbed');
    } else {
      game.stats.shots++;
      if (c || item || charged) {
        game.stats.hits++;
        game.misses = 0;
        vibrate(15);
        if (c) c.hit();
        else if (item) game.collect(item);
        else { game.charge = false; rift.collapse(); scanner.say('chargeUsed', true); }
      } else if (++game.misses >= 4) {
        game.misses = 0;
        scanner.say('miss');
      }
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
