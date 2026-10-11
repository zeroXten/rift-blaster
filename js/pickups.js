// Power-ups. A creature sometimes leaves one behind when it is shot. It appears a little way
// off from where the creature died, so it is not picked up by accident, and hangs there until
// it is shot or fades. Collected power-ups are kept (up to MAX_HELD of each) and used from the
// buttons on the scanner's left grip.

import { UI } from './config.js';
import { DEG, dirFromBearing, onScreen, project, view } from './projection.js';
import { blit, box, px } from './render.js';
import { getSprite } from './sprites.js';
import { clamp } from './util.js';

// time is how long a timed effect lasts; weight is how often it turns up.
export const POWERUPS = {
  rapid:  { name: 'RAPID FIRE',    icon: 'pu_rapid',  color: '#ffd23f', time: 8, weight: 3 },
  health: { name: 'HEALTH',        icon: 'pu_health', color: '#8be025', weight: 2 },
  nova:   { name: 'GRENADE',       icon: 'pu_nova',   color: '#ff3b3b', weight: 2 },
  stasis: { name: 'STASIS',        icon: 'pu_stasis', color: '#7fb4ff', time: 5, weight: 2 },
  charge: { name: 'RIFT CHARGE',   icon: 'pu_charge', color: '#39e6d0', weight: 1.5 },
};

export const powerIcon = kind => getSprite(POWERUPS[kind].icon, 'vesh').frames[0];

export const MAX_HELD = 3;
const LIFE = 12, ARMING = 0.5;      // seconds it lasts; seconds before it can be collected

export class Pickup {
  constructor(kind, yaw, pitch) {
    this.kind = kind;
    this.def = POWERUPS[kind];
    this.yaw = yaw;
    this.pitch = clamp(pitch, -14 * DEG, 14 * DEG);
    this.life = LIFE;
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
    // Blinks through its last three seconds.
    if (!this.on || (this.life < 3 && ((this.t * 8) | 0) & 1)) return;
    const x = Math.round(this.p.x), y = Math.round(this.p.y), c = this.def.color;
    // Flashes white as it appears.
    box(x - 10, y - 10, 21, 21, this.t < 0.25 ? '#ffffff' : UI.k, c);
    blit(powerIcon(this.kind), x + 0.5, y + 0.5, 2);
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
