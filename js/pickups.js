// Power-ups. A creature sometimes leaves one behind when it is shot. It appears a little way
// off from where the creature died, so it is not picked up by accident, and hangs there for a
// few seconds: shoot it before its timer runs out or it is gone. Collected power-ups are kept (up to MAX_HELD of each) and used from the
// buttons on the scanner's left grip.

import { UI, level } from './config.js';
import { DEG, dirFromBearing, onScreen, project, view } from './projection.js';
import { blit, box, px } from './render.js';
import { getSprite } from './sprites.js';
import { clamp } from './util.js';

// Listed in the order they become available, which is also the order of their buttons.
//   from   the first level it can drop on: the stronger ones only turn up once there is
//          enough going on to need them
//   time   how long a timed effect lasts, in seconds
//   want   how likely it is to be the one that drops, given the state of play: live (creatures
//          out in the open), open (rifts open), wide (rifts wide open), health, reality
//   info   its line in the how-to-play guide
export const POWERUPS = {
  rapid: { name: 'RAPID FIRE', icon: 'pu_rapid', color: '#ffd23f', from: 2, time: 8,
    want: s => 2 + 0.3 * s.live, info: '8 seconds without heat. Hold FIRE.' },
  health: { name: 'HEALTH', icon: 'pu_health', color: '#8be025', from: 2,
    want: s => (s.health < 50 ? 5 : s.health < 85 ? 2 : 0.3), info: 'Gives back a quarter of your health.' },
  stasis: { name: 'STASIS', icon: 'pu_stasis', color: '#7fb4ff', from: 4, time: 5,
    want: s => 1 + 0.4 * s.live + (s.reality < 50 ? 2 : 0), info: 'Freezes creatures and rifts for 5 seconds.' },
  nova: { name: 'GRENADE', icon: 'pu_nova', color: '#ff3b3b', from: 6,
    want: s => 0.4 + 0.6 * s.live, info: 'Destroys creatures near where you aim.' },
  charge: { name: 'RIFT CHARGE', icon: 'pu_charge', color: '#39e6d0', from: 8,
    want: s => (s.open < 2 ? 0.3 : 0.6 * s.open + s.wide) + (s.reality < 50 ? 1.5 : 0), info: 'Your next shot into a rift closes it.' },
};

// How likely a kill is to leave a power-up: rare while things are calm, common in a crowd.
// live is the number of creatures still out in the open.
export const dropChance = live => Math.min(0.4, 0.07 + 0.04 * live);

export const powerIcon = kind => getSprite(POWERUPS[kind].icon, 'vesh').frames[0];

export const MAX_HELD = 3;
const LIFE = 6, ARMING = 0.5;       // seconds it lasts (longer on easier settings); seconds before it can be collected

export class Pickup {
  constructor(kind, yaw, pitch) {
    this.kind = kind;
    this.def = POWERUPS[kind];
    this.yaw = yaw;
    this.pitch = clamp(pitch, -14 * DEG, 14 * DEG);
    this.life = this.span = LIFE * level.linger;
    this.t = 0;
    this.taken = false;
    this.dir = [0, 0, 0];
    this.p = {};
    this.on = false;
    this.update(0);
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    dirFromBearing(this.yaw, this.pitch + Math.sin(this.t * 2.5) * 1.2 * DEG, this.dir);
    project(this.dir, this.p);
    this.on = onScreen(this.p, 12, 12);
  }

  // Is the crosshair on it? tolPx is the weapon's tolerance in pixels.
  aimed(tolPx) {
    return this.on && this.t > ARMING && Math.hypot(this.p.x - view.cx, this.p.y - view.cy) < 11 + tolPx;
  }

  draw() {
    // Blinks through its last two seconds.
    if (!this.on || (this.life < 2 && ((this.t * 8) | 0) & 1)) return;
    const x = Math.round(this.p.x), y = Math.round(this.p.y), c = this.def.color;
    // Flashes white as it appears.
    box(x - 10, y - 10, 21, 21, this.t < 0.25 ? '#ffffff' : UI.k, c);
    blit(powerIcon(this.kind), x + 0.5, y + 0.5, 2);
    // How long is left to collect it.
    px(x - 10, y + 17, 21, 4, UI.k);
    px(x - 9, y + 18, Math.round(19 * Math.max(0, this.life / this.span)), 2, this.life < 2 ? UI.red : c);
    // Corner brackets that pulse, so it reads as something to shoot.
    const d = 13 + (((this.t * 4) | 0) & 1);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        px(x + sx * d - (sx > 0 ? 3 : 0), y + sy * d, 4, 1, c);
        px(x + sx * d, y + sy * d - (sy > 0 ? 3 : 0), 1, 4, c);
      }
    }
  }
}
