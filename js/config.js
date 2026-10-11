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

// Difficulty. Each field scales the hard setting, which is the game as designed:
//   speed     how fast creatures close in          spawn    time between arrivals
//   alive     most creatures in play at once       pack     creatures added to each group
//   damage    integrity lost per hit taken         hold     kills needed before a rift seals (and the boss's health)
//   growth    how fast a rift widens once torn     gap      time between scheduled rifts
//   maxOpen   most rifts open at once              tol      extra degrees of aiming forgiveness
//   sealAngle how close the crosshair must be to seal        seal    time the seal takes
//   heat      heat per shot                        patience how long before an Ootheen jumps, a stunned boss recovers
//   score     score multiplier
// Easy keeps things happening but never many at once: one rift, at most two creatures in play,
// and the next one arrives soon after there is room for it.
export const DIFFICULTY = {
  easy:   { name: 'EASY',   speed: 0.5, spawn: 0.6,  alive: 2,  pack: -1, damage: 0.25, hold: 0.5, growth: 0.4, gap: 1,   maxOpen: 1, tol: 5, sealAngle: 1.7,  seal: 0.6, heat: 0.5, patience: 2.5,  score: 0.5 },
  medium: { name: 'MEDIUM', speed: 0.9, spawn: 1.15, alive: 99, pack: 0,  damage: 0.8,  hold: 0.8, growth: 0.9, gap: 1.1, maxOpen: 3, tol: 1, sealAngle: 1.15, seal: 1,   heat: 0.9, patience: 1.25, score: 1 },
  hard:   { name: 'HARD',   speed: 1,   spawn: 1,    alive: 99, pack: 0,  damage: 1,    hold: 1,   growth: 1,   gap: 1,   maxOpen: 9, tol: 0, sealAngle: 1,    seal: 1,   heat: 1,   patience: 1,    score: 1.5 },
};

// The difficulty in force. Game code reads its numbers from here.
export const level = { key: 'medium', ...DIFFICULTY.medium };

export function setDifficulty(key) {
  if (!DIFFICULTY[key]) key = 'medium';
  Object.assign(level, DIFFICULTY[key], { key });
}
