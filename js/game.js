// The game in play: rifts, creatures, weapon and effects. One Game lasts a whole run: as each
// level's last rift is sealed, advance() lays the next level over the top of it without a
// break. There are two ways to lose. Health is the player: creatures that reach them take it.
// Reality is the room: every rift left open wears it down, and a crowd of creatures adds to
// that, so the run can be lost without ever being touched.

import { CROWD_FREE, CROWD_STRAIN, MAX_CREATURES, PITCH_LIMIT, SEAL_RESTORES, STRAIN, level } from './config.js';
import { DEG, view, wrapAngle } from './projection.js';
import { R, cameraFrame, debugBackdrop, px } from './render.js';
import { camera } from './video.js';
import { recalibrate } from './orientation.js';
import { Rift } from './rift.js';
import { CREATURES } from './creatures/index.js';
import { Weapon } from './weapon.js';
import { Fx } from './fx.js';
import { MAX_HELD, POWERUPS, Pickup, dropChance } from './pickups.js';
import { drawHud } from './hud.js';
import { drawIndicators } from './indicators.js';
import { play } from './audio/sfx.js';
import { setIntensity } from './audio/music.js';
import { scanner } from './scanner.js';
import { clamp, rand, vibrate } from './util.js';

const BLAST = 35 * DEG;      // a grenade takes out everything within this angle of it

export class Game {
  // def is a level from levels.js; inv is the power-ups held, by kind.
  constructor(def, { inv }) {
    this.def = def;
    this.t = 0;
    this.health = 100;
    this.reality = 100;
    this.cause = null;        // what ended the run: 'health' or 'reality'
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
    this.health = Math.min(100, this.health + 15);
    this.reality = Math.min(100, this.reality + 15);
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

  // On easy everything is kept within an arc in front of the player, so there is no need to
  // turn around. "In front" is where they were facing as the run started, or when they last
  // recalibrated. Takes and returns a yaw in radians; margin widens the arc, in degrees.
  inArc(yaw, margin = 0) {
    if (level.arc >= 180) return yaw;
    const limit = (level.arc + margin) * DEG;
    return clamp(wrapAngle(yaw), -limit, limit);
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
    const arc = level.arc, narrow = arc < 180;
    let { yaw, pitch } = def;
    if (yaw != null) yaw += view.yaw / DEG;
    else {
      // Anywhere the difficulty allows, but not on top of a rift that is already open.
      const apart = Math.min(50, arc * 0.7) * DEG;
      for (let i = 0; i < 30; i++) {
        yaw = rand(-arc, arc);
        if (this.rifts.every(r => r.sealed || Math.abs(wrapAngle(yaw * DEG - r.yaw)) > apart)) break;
      }
    }
    yaw = this.inArc(yaw * DEG) / DEG;
    // With a narrow arc, rifts also stay near eye level.
    if (pitch == null) pitch = (Math.random() + Math.random() - 1) * PITCH_LIMIT * (narrow ? 0.5 : 1);
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

  // A shot creature may leave a power-up, off to one side of where it died. How often, and
  // which one, follows how much is going on: more of them in a crowd, and the kind that would
  // help most right now. Only kinds unlocked by this level can appear.
  maybeDrop(creature) {
    if (this.def.noDrops || creature.pods || this.ending) return;
    this.sinceDrop++;
    if (this.t - this.dropT < 4 || this.pickups.length >= 2) return;
    const state = { live: 0, open: 0, wide: 0, health: this.health, reality: this.reality };
    for (const c of this.creatures) if (!c.pods && c.state === 'active') state.live++;
    for (const r of this.rifts) if (!r.sealed) { state.open++; if (r.stage === 2) state.wide++; }
    // A long dry spell ends with a drop regardless.
    if (Math.random() > dropChance(state.live) * level.drops && this.sinceDrop < 10) return;
    const want = kind => (level.n < POWERUPS[kind].from || this.inv[kind] >= MAX_HELD ? 0 : POWERUPS[kind].want(state));
    const kinds = Object.keys(POWERUPS);
    let roll = Math.random() * kinds.reduce((sum, k) => sum + want(k), 0);
    const kind = kinds.find(k => (roll -= want(k)) < 0);
    if (!kind) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.pickups.push(new Pickup(kind, this.inArc(creature.yaw + side * rand(11, 17) * DEG, 8), creature.pitch + rand(-7, 7) * DEG));
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
    if (kind === 'health' && this.health >= 100) { play('denied'); scanner.say('full'); return; }
    this.inv[kind]--;
    this.banner = { text: def.name, color: def.color, t: 1.4 };
    play('pickup');
    vibrate(30);
    scanner.say(kind, true);
    if (kind === 'rapid') { this.rapid = def.time; this.weapon.cool(); }
    else if (kind === 'health') this.health = Math.min(100, this.health + 25);
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
    this.reality = Math.min(100, this.reality + SEAL_RESTORES);
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
    this.health = Math.max(0, this.health - amount * level.damage);
    this.streak = 0;
    this.fx.hurt();
    play('damage', source?.p.pan);
    vibrate([80, 40, 80]);
    if (this.health <= 30 && !this.lowWarned) { this.lowWarned = true; scanner.say('low', true); }
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

    this.strain(frozen ? 0 : dt);
    if (this.t > 0.8) this.emit('start');
    if (this.rifts[0]?.on) this.emit('riftSeen');
    this.conduct();

    if (this.ending) {
      this.endT -= dt;
      if (this.endT <= 0) this.result = this.ending;
    } else if (this.cleared) {
      // Waiting for main.js to supply the next level, which it does before the next frame.
    } else if (this.health <= 0 || this.reality <= 0) {
      this.cause = this.health <= 0 ? 'health' : 'reality';
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

  // Open rifts wear reality down, wider ones faster, and so does a crowd of creatures. It
  // mends slowly while nothing is open.
  strain(dt) {
    if (this.ending) return;
    let rate = 0, open = 0;
    for (const r of this.rifts) {
      if (r.sealed) continue;
      open++;
      // The boss's rift has to stay open for the whole fight, so it strains far less.
      rate += STRAIN[r.stage] * (r.def.boss ? 0.25 : 1);
    }
    let live = 0;
    for (const c of this.creatures) if (!c.pods && c.state === 'active') live++;
    rate += Math.max(0, live - CROWD_FREE) * CROWD_STRAIN;
    const before = this.reality;
    this.reality = Math.max(0, Math.min(100, this.reality + (open ? -rate * level.strain : 1.5) * dt));
    for (const mark of [60, 30]) {
      if (before > mark && this.reality <= mark) scanner.say(mark === 60 ? 'fracturing' : 'collapsing', true);
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
    this.fx.drawFracture(this.reality, this.health);
    drawIndicators(this);
    drawHud(this);
  }
}
