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
export const SEAL_TIME = 1.6;        // seconds of holding SEAL on a weakened rift
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

// What the current level asks of the player. Game code reads its numbers from here:
//   speed     how fast creatures close in          spawn    time between arrivals (lower is busier)
//   alive     most creatures in play at once       pack     creatures added to each group
//   damage    integrity lost per hit taken         hold     kills needed before a rift seals (and the boss's health)
//   growth    how fast an open rift widens         maxOpen  most rifts open at once
//   tol       extra degrees of aiming forgiveness  sealAngle how close the crosshair must be to seal
//   seal      time the seal takes                  heat     heat per shot
//   patience  how long before an Ootheen jumps, a Thrum charges, a stunned boss recovers
//   score     score multiplier                     drops    how often creatures leave power-ups
export const level = { key: 'medium', n: 1 };

// The picker on the title screen. Hard is the game as designed; the others scale it. ramp is
// how quickly the levels escalate, so easy stays gentle for a long time.
export const DIFFICULTY = {
  easy:   { name: 'EASY',   ramp: 0.4, speed: 0.6, spawn: 0.8, alive: 2,  pack: -1, damage: 0.3, hold: 0.6, growth: 0.5, maxOpen: -2, tol: 4, sealAngle: 1.5, seal: 0.7, heat: 0.5, patience: 2,   score: 0.5, drops: 1.5 },
  medium: { name: 'MEDIUM', ramp: 0.8, speed: 0.9, spawn: 1.1, alive: 99, pack: 0,  damage: 0.8, hold: 0.9, growth: 0.9, maxOpen: 0,  tol: 1, sealAngle: 1.1, seal: 1,   heat: 0.9, patience: 1.2, score: 1,   drops: 1.2 },
  hard:   { name: 'HARD',   ramp: 1,   speed: 1,   spawn: 1,   alive: 99, pack: 0,  damage: 1,   hold: 1,   growth: 1,   maxOpen: 0,  tol: 0, sealAngle: 1,   seal: 1,   heat: 1,   patience: 1,   score: 1.5, drops: 1 },
};

// Every level is harder than the last, without limit: faster creatures in bigger groups,
// arriving more often from more rifts at once, hitting harder, with less aiming forgiveness.
export function setLevel(n) {
  const d = DIFFICULTY[level.key], t = (n - 1) * d.ramp;
  Object.assign(level, {
    n,
    speed: Math.min(2.4, 0.85 + 0.08 * t) * d.speed,
    spawn: Math.max(0.4, 1.15 - 0.07 * t) * d.spawn,
    alive: d.alive + Math.floor(t),
    pack: Math.min(4, Math.floor(t / 3)) + d.pack,
    damage: (0.9 + 0.12 * t) * d.damage,
    hold: Math.min(2, 0.8 + 0.1 * t) * d.hold,
    growth: (0.8 + 0.12 * t) * d.growth,
    maxOpen: Math.max(1, Math.min(6, 2 + Math.floor(t / 3)) + d.maxOpen),
    tol: Math.max(0, 1.5 - 0.4 * t) + d.tol,
    sealAngle: d.sealAngle,
    seal: d.seal,
    heat: d.heat,
    patience: Math.max(0.6, 1.3 - 0.1 * t) * d.patience,
    score: (1 + 0.25 * (n - 1)) * d.score,
    drops: d.drops,
  });
}

export function setDifficulty(key) {
  level.key = DIFFICULTY[key] ? key : 'medium';
  setLevel(level.n);
}

setLevel(1);
