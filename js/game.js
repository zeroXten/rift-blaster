// The game in play: rifts, creatures, weapon and effects. One Game lasts a whole run: as each
// level's last rift is sealed, advance() lays the next level over the top of it without a
// break, until Reality Integrity reaches zero.

import { MAX_CREATURES, PITCH_LIMIT, level } from './config.js';
import { DEG, view, wrapAngle } from './projection.js';
import { R, cameraFrame, debugBackdrop, px } from './render.js';
import { camera } from './video.js';
import { recalibrate } from './orientation.js';
import { Rift } from './rift.js';
import { CREATURES } from './creatures/index.js';
import { Weapon } from './weapon.js';
import { Fx } from './fx.js';
import { MAX_HELD, POWERUPS, Pickup } from './pickups.js';
import { drawHud } from './hud.js';
import { drawIndicators } from './indicators.js';
import { play } from './audio/sfx.js';
import { setIntensity } from './audio/music.js';
import { scanner } from './scanner.js';
import { rand, vibrate } from './util.js';

const BLAST = 35 * DEG;      // a grenade takes out everything within this angle of it

export class Game {
  // def is a level from levels.js. integrity and inv (power-ups held, by kind) carry over
  // from the level before.
  constructor(def, { integrity = 100, inv }) {
    this.def = def;
    this.t = 0;
    this.integrity = integrity;
    this.inv = inv;
    this.rifts = [];
    this.creatures = [];
    this.pickups = [];
    // Power-up state. trigger is whether the fire button is being held, for rapid fire.
    this.rapid = 0;           // seconds of rapid fire left
    this.stasis = 0;          // seconds creatures and rifts stay frozen
    this.charge = false;      // a rift charge is loaded: the next shot into a rift closes it
    this.trigger = false;
    this.sealing = false;     // the SEAL button is being held
    this.banner = null;       // { text, color, t }: the name of a power-up just taken
    this.dropT = -99;
    this.sinceDrop = 0;
    this.pending = def.rifts.slice().sort((a, b) => a.at - b.at);
    this.total = this.pending.length;
    this.stats = { shots: 0, hits: 0, kills: 0, sealed: 0 };
    this.weapon = new Weapon();
    this.fx = new Fx();
    this.emitted = {};
    this.streak = 0;
    this.misses = 0;
    this.quiet = 0;
    this.lowWarned = false;
    this.cleared = false;     // the level's last rift has just been sealed
    this.ending = null;       // 'lost' while the last effects play out
    this.endT = 0;
    this.result = null;       // 'lost' once the run is over
    // A run starts with wherever the player is facing as forwards.
    recalibrate();
  }

  // Carries straight on into the next level: its rifts are scheduled from now, and everything
  // else (heat, power-ups held and in force, anything still on screen) stays as it is.
  advance(def) {
    this.def = def;
    this.cleared = false;
    this.pending = def.rifts.map(r => ({ ...r, at: r.at + this.t })).sort((a, b) => a.at - b.at);
    this.total = this.pending.length;
    this.rifts = this.rifts.filter(r => r.sealAnim < 0.45);      // let the last seal finish closing
    this.stats = { shots: 0, hits: 0, kills: 0, sealed: 0 };
    this.emitted = {};
    this.quiet = 0;
    this.integrity = Math.min(100, this.integrity + 20);
    this.weapon.retune();
  }

  // First-occurrence game events. A level can attach a scanner line to any of them.
  emit(name) {
    if (this.emitted[name]) return;
    this.emitted[name] = true;
    const hint = this.def.hints?.[name];
    if (hint) scanner.show(hint, true);
  }

  // How many more creatures may be in play, under the difficulty's cap. The boss does not count.
  room() {
    let live = 0;
    for (const c of this.creatures) if (!c.pods && c.state !== 'dying') live++;
    return Math.min(level.alive - live, MAX_CREATURES - this.creatures.length);
  }

  // Does this level include that kind of creature yet?
  allows(type) {
    return !this.def.types || this.def.types.includes(type);
  }

  spawn(type, rift, opts) {
    const c = new CREATURES[type](this, rift, opts);
    this.creatures.push(c);
    return c;
  }

  openRift(def) {
    // A bearing given by the level is relative to where the player is facing right now.
    let { yaw, pitch } = def;
    if (yaw != null) yaw += view.yaw / DEG;
    else {
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
    else if (this.rifts.length > 1 || !this.def.hints) scanner.say(rift.p.front ? 'riftOpen' : 'riftBehind');
  }

  onKill(creature) {
    this.stats.kills++;
    const rift = creature.rift;
    if (rift.lockKills && rift.kills === rift.lockKills && !rift.sealed && !this.def.hints) scanner.say('weak', true);
    this.emit('firstKill');
    if (++this.streak % 6 === 0) scanner.say('streak');
    if (this.rifts.some(r => r.lockKills && r.kills === r.lockKills)) this.emit('unlocked');
    this.maybeDrop(creature);
  }

  // Fairly often a shot creature leaves a power-up, off to one side of where it died.
  maybeDrop(creature) {
    if (this.def.noDrops || creature.pods || this.ending) return;
    this.sinceDrop++;
    if (this.t - this.dropT < 4 || this.pickups.length >= 2) return;
    if (Math.random() > 0.22 * level.drops && this.sinceDrop < 6) return;
    // Health turns up when it is needed; nothing turns up that the player is already full of.
    const weight = kind => (this.inv[kind] >= MAX_HELD ? 0
      : kind === 'health' ? (this.integrity < 50 ? 4 : this.integrity < 85 ? 2 : 0.5)
      : POWERUPS[kind].weight);
    const kinds = Object.keys(POWERUPS);
    let roll = Math.random() * kinds.reduce((sum, k) => sum + weight(k), 0);
    const kind = kinds.find(k => (roll -= weight(k)) < 0);
    if (!kind) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.pickups.push(new Pickup(kind, creature.yaw + side * rand(11, 17) * DEG, creature.pitch + rand(-7, 7) * DEG));
    this.dropT = this.t;
    this.sinceDrop = 0;
    play('drop', creature.p.pan);
    scanner.say('drop');
  }

  // The player shot a power-up: it goes into the inventory for later.
  collect(item) {
    const def = item.def;
    item.taken = true;
    this.inv[item.kind] = Math.min(MAX_HELD, this.inv[item.kind] + 1);
    this.banner = { text: '+ ' + def.name, color: def.color, t: 1.6 };
    this.fx.burst(item.p.x, item.p.y, [def.color, '#ffffff'], 14, 70);
    play('pickup');
    vibrate(30);
    scanner.say('got');
  }

  // A power-up button was pressed.
  use(kind) {
    const def = POWERUPS[kind];
    if (this.ending) return;
    if (!this.inv[kind]) { play('denied'); scanner.say('empty'); return; }
    if (kind === 'health' && this.integrity >= 100) { play('denied'); scanner.say('full'); return; }
    this.inv[kind]--;
    this.banner = { text: def.name, color: def.color, t: 1.4 };
    play('pickup');
    vibrate(30);
    scanner.say(kind, true);
    if (kind === 'rapid') { this.rapid = def.time; this.weapon.cool(); }
    else if (kind === 'health') this.integrity = Math.min(100, this.integrity + 25);
    else if (kind === 'stasis') { this.stasis = def.time; play('stasis'); }
    else if (kind === 'charge') this.charge = true;
    else this.blast();
  }

  // A grenade, thrown where the scanner is pointing: every creature out in the open near
  // that spot is destroyed.
  blast() {
    const d = view.fwd;
    for (const c of this.creatures.slice()) {
      if (c.pods) { c.blasted(); continue; }
      if (c.state !== 'active') continue;
      const cos = d[0] * c.dir[0] + d[1] * c.dir[1] + d[2] * c.dir[2];
      if (Math.acos(Math.max(-1, Math.min(1, cos))) < BLAST) { c.hp = 0; c.die(true); }
    }
    this.fx.nova(view.cx, view.cy, ['#ff3b3b', '#ffd23f', '#ffffff']);
    play('nova');
    vibrate([60, 30, 120]);
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
      for (const r of this.rifts) r.seal();
      this.total = this.stats.sealed;
    } else {
      scanner.say('sealed');
    }
  }

  damage(amount, source) {
    if (this.ending) return;
    this.integrity = Math.max(0, this.integrity - amount * level.damage);
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
    const room = level.maxOpen - open;
    if (next && !this.ending && room > 0 && (this.t >= next.at || this.quiet > 1)) {
      // Rifts scheduled for the same moment open together, as far as the level allows.
      for (let n = 0; n < room && this.pending[0]?.at === next.at; n++) this.openRift(this.pending.shift());
    }

    this.rapid = Math.max(0, this.rapid - dt);
    this.stasis = Math.max(0, this.stasis - dt);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    // In stasis nothing advances: creatures hang where they are and rifts neither widen nor
    // deliver. The boss is too big to hold, and anything already dying finishes dying.
    const frozen = this.stasis > 0;
    for (const r of this.rifts) { r.emerging = 0; r.clingers = 0; r.alive = 0; r.pull = 0; }
    for (const c of this.creatures) {
      if (frozen && !c.pods && c.state !== 'dying') c.freeze();
      else c.update(dt);
    }
    for (const r of this.rifts) r.update(frozen && !r.sealed ? 0 : dt);
    for (const item of this.pickups) item.update(dt);
    this.weapon.update(dt, this);
    this.fx.update(dt);
    this.creatures = this.creatures.filter(c => !c.dead);
    this.pickups = this.pickups.filter(item => !item.taken && item.life > 0);

    if (this.t > 0.8) this.emit('start');
    if (this.rifts[0]?.on) this.emit('riftSeen');
    this.conduct();

    if (this.ending) {
      this.endT -= dt;
      if (this.endT <= 0) this.result = this.ending;
    } else if (this.cleared) {
      // Waiting for main.js to supply the next level, which it does before the next frame.
    } else if (this.integrity <= 0) {
      this.ending = 'lost';
      this.endT = 1.6;
      play('lose');
    } else if (!this.pending.length && this.rifts.length && this.rifts.every(r => r.sealed)) {
      // Level cleared. With no rift left to hold them here, whatever arrived comes apart, and
      // main.js moves straight on to the next level: nothing stops.
      this.cleared = true;
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
    if (this.stasis > 0) {
      // A cold tint over everything that is being held.
      R.ctx.globalAlpha = 0.16;
      px(R.view.x, R.view.y, R.view.w, R.view.h, POWERUPS.stasis.color);
      R.ctx.globalAlpha = 1;
    }
    for (const item of this.pickups) item.draw();
    this.fx.draw();
    drawIndicators(this);
    drawHud(this);
  }
}
