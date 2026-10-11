// Tunable constants. Angles are in degrees here and converted where used.

export const H = 240;                // canvas height in pixels (landscape); width follows the screen
export const FOV_LONG = 64;          // field of view across the width of the scanner's screen. A mismatch with the real camera makes rifts swim.
export const SMOOTHING = 18;         // orientation slerp rate, per second

export const RIFT_DIST = 10;         // rifts sit on a sphere of this radius
export const REACH_DIST = 1.4;       // a creature this close has reached the player
export const PITCH_LIMIT = 24;       // the view is short in landscape, so rifts stay nearer the horizon
export const STAGE_TEAR = 0.33;      // rift width thresholds
export const STAGE_BREACH = 0.66;
export const RIFT_FULL_TIME = 80;    // seconds for an unattended rift to go from nothing to fully open
export const MAX_CREATURES = 40;

export const SEAL_ANGLE = 6;
export const SEAL_TIME = 2;
export const BEAM_TOL = 3;           // aiming tolerance on top of the target's own size
export const HEAT_PER_SHOT = 9;
export const HEAT_DECAY = 26;        // % per second
export const OVERHEAT_LOCK = 2;

export const UI = {
  c: '#39e6d0',
  dim: '#0d4a4a',
  mid: '#6aa6a6',
  red: '#ff3b3b',
  yel: '#ffd23f',
  w: '#f4f4f4',
  k: '#05070f',
};
