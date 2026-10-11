// One incident in play: its rifts, creatures, weapon and effects, from the first rift opening
// to the last one sealed or Reality Integrity reaching zero.

import { PITCH_LIMIT } from './config.js';
import { DEG, wrapAngle } from './projection.js';
import { cameraFrame, debugBackdrop } from './render.js';
import { camera } from './video.js';
import { recalibrate } from './orientation.js';
import { Rift } from './rift.js';
import { CREATURES } from './creatures/index.js';
import { Weapon } from './weapon.js';
import { Fx } from './fx.js';
import { drawHud } from './hud.js';
import { drawIndicators } from './indicators.js';
import { play } from './audio/sfx.js';
import { setIntensity } from './audio/music.js';
import { scanner } from './scanner.js';
import { rand, vibrate } from './util.js';

export class Game {
  constructor(incident, upgrades) {
    this.incident = incident;
    this.t = 0;
    this.integrity = 100;
    this.rifts = [];
    this.creatures = [];
    this.pending = incident.rifts.slice().sort((a, b) => a.at - b.at);
    this.total = this.pending.length;
    this.stats = { shots: 0, hits: 0, kills: 0, sealed: 0 };
    this.weapon = new Weapon(upgrades);
    this.fx = new Fx();
    this.emitted = {};
    this.streak = 0;
    this.misses = 0;
    this.quiet = 0;
    this.lowWarned = false;
    this.ending = null;       // 'won' | 'lost' while the last effects play out
    this.endT = 0;
    this.result = null;       // set when the incident is over
    // Rift bearings are relative to wherever the player is facing as the incident starts.
    recalibrate();
  }

  // First-occurrence game events. An incident can attach a scanner line to any of them.
  emit(name) {
    if (this.emitted[name]) return;
    this.emitted[name] = true;
    const hint = this.incident.hints?.[name];
    if (hint) scanner.show(hint, true);
  }

  spawn(type, rift, opts) {
    const c = new CREATURES[type](this, rift, opts);
    this.creatures.push(c);
    return c;
  }

  openRift(def) {
    let { yaw, pitch } = def;
    if (yaw == null) {
      // Anywhere in the full circle, but not on top of a rift that is already open.
      for (let i = 0; i < 30; i++) {
        yaw = rand(-180, 180);
        if (this.rifts.every(r => r.sealed || Math.abs(wrapAngle(yaw * DEG - r.yaw)) > 50 * DEG)) break;
      }
    }
    if (pitch == null) pitch = (Math.random() + Math.random() - 1) * PITCH_LIMIT;
    const rift = new Rift(this, { ...def, yaw, pitch });
    this.rifts.push(rift);
    play('crack', rift.p.pan);
    if (def.boss) this.spawn('ummagog', rift);
    else if (this.rifts.length > 1 || !this.incident.hints) scanner.say(rift.p.front ? 'riftOpen' : 'riftBehind');
  }

  onKill() {
    this.stats.kills++;
    this.emit('firstKill');
    if (++this.streak % 6 === 0) scanner.say('streak');
    if (this.rifts.some(r => r.lockKills && r.kills === r.lockKills)) this.emit('unlocked');
  }

  onSealed(rift) {
    this.stats.sealed++;
    vibrate(60);
    for (const c of this.creatures) {
      if (c.rift !== rift) continue;
      if (c.onRiftSealed) c.onRiftSealed();
      else if (c.state === 'emerge') c.die(false);
    }
    if (rift.def.boss) {
      // The big rift takes everything else with it.
      this.pending.length = 0;
      this.total = this.rifts.length;
      for (const r of this.rifts) r.seal();
    } else {
      scanner.say('sealed');
    }
  }

  damage(amount, source) {
    if (this.ending) return;
    this.integrity = Math.max(0, this.integrity - amount * (this.incident.damageScale ?? 1));
    this.streak = 0;
    this.fx.hurt();
    play('damage', source?.p.pan);
    vibrate([80, 40, 80]);
    if (this.integrity <= 30 && !this.lowWarned) { this.lowWarned = true; scanner.say('low', true); }
    else scanner.say('damage');
  }

  fire() {
    if (!this.ending) this.weapon.fire(this);
  }

  update(dt) {
    this.t += dt;

    // Open the next scheduled rift, or sooner if the player has had nothing to do for a few seconds.
    const open = this.rifts.reduce((n, r) => n + !r.sealed, 0);
    this.quiet = open ? 0 : this.quiet + dt;
    const next = this.pending[0];
    if (next && !this.ending && open < (this.incident.maxOpen || 3) && (this.t >= next.at || this.quiet > 1.5)) {
      // Rifts scheduled for the same moment open together, so they cannot all be caught as cracks.
      while (this.pending[0]?.at === next.at) this.openRift(this.pending.shift());
    }

    for (const r of this.rifts) { r.emerging = 0; r.clingers = 0; r.alive = 0; r.pull = 0; }
    for (const c of this.creatures) c.update(dt);
    for (const r of this.rifts) r.update(dt);
    this.weapon.update(dt, this);
    this.fx.update(dt);
    this.creatures = this.creatures.filter(c => !c.dead);

    if (this.t > 0.8) this.emit('start');
    if (this.rifts[0]?.on) this.emit('riftSeen');
    this.conduct();

    if (this.ending) {
      this.endT -= dt;
      if (this.endT <= 0) this.result = this.ending;
    } else if (this.integrity <= 0) {
      this.ending = 'lost';
      this.endT = 1.6;
      play('lose');
    } else if (!this.pending.length && this.rifts.length && this.rifts.every(r => r.sealed)) {
      // With no rift left to hold them here, whatever came through comes apart.
      this.ending = 'won';
      this.endT = 1.8;
      play('win');
      for (const c of this.creatures) c.die(false);
    }
  }

  // Music follows the rifts: more layers and a faster tempo as they widen, and the motif of the widest one.
  conduct() {
    let heat = 0, widest = null;
    for (const r of this.rifts) {
      if (r.sealed) continue;
      heat += [0.25, 1, 2][r.stage];
      if (r.stage > 0 && (!widest || r.width > widest.width)) widest = r;
    }
    setIntensity(Math.min(3, Math.floor(heat)), widest?.dim || null);
  }

  draw() {
    const glitch = this.ending === 'lost' ? 1 : this.fx.glitch / 0.4;
    if (camera.ready) cameraFrame(camera.video, glitch);
    else debugBackdrop(glitch);
    for (const r of this.rifts) r.draw();
    // Painter's order, far to near, the way Doom drew its monsters.
    this.creatures.sort((a, b) => b.r - a.r);
    for (const c of this.creatures) c.draw();
    this.fx.draw();
    drawIndicators(this);
    drawHud(this);
  }
}
