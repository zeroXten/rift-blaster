// Levels and per-dimension spawn rules. Data, plus the small generator that lays out a level:
// retuning a dimension or changing how levels are built should not need changes to game logic.
// How hard a level is (speed, damage, group sizes) is the scaling in config.js; this file says
// what is in it.

import { rand } from './util.js';

export const DIM_SPAWN = {
  // interval and max are [open, wide open]. max caps creatures alive from one rift.
  // hold is how many of its creatures must be shot before a rift of that dimension will seal.
  // spawns lists what can arrive: pack is the group size as [open, wide open] ranges, weight
  // is how often it is chosen, limit caps how many of that type the rift has out at once.
  vesh: { interval: [7, 5.5], max: [8, 10], hold: 5, spawns: [
    { type: 'yrrk', weight: 3, pack: [[3, 3], [3, 4]] },
    { type: 'zik', weight: 2, pack: [[2, 2], [2, 3]] },
  ] },
  ulta: { interval: [4, 4], max: [1, 2], hold: 2, spawns: [
    { type: 'glomm', weight: 3, pack: [[1, 1], [1, 1]] },
    { type: 'brakk', weight: 1, pack: [[1, 1], [1, 1]], limit: 1 },
  ] },
  hollow: { interval: [7, 5], max: [2, 3], hold: 2, spawns: [
    { type: 'skaith', weight: 3, pack: [[1, 1], [1, 1]] },
    { type: 'fael', weight: 2, pack: [[1, 1], [1, 2]] },
  ] },
  miridian: { interval: [5, 4], max: [1, 2], hold: 2, spawns: [
    { type: 'ootheen', weight: 3, pack: [[1, 1], [1, 1]] },
    { type: 'thrum', weight: 2, pack: [[1, 1], [1, 1]] },
  ] },
};

const DIM_ORDER = ['vesh', 'ulta', 'hollow', 'miridian'];

// The creatures each of the first levels introduces. From level 4 everything is in play.
const FRESH = {
  1: ['yrrk'],
  2: ['glomm', 'zik'],
  3: ['skaith', 'brakk'],
  4: ['ootheen', 'thrum', 'fael'],
  5: ['ummagog'],
};

// Scanner lines forced on the first occurrence of a game event, for the first level only.
const TUTORIAL = {
  start: 'Rift detected. Follow the arrow.',
  riftSeen: 'That is a rift. It is too strong to seal yet.',
  tear: 'It is open. Creatures will arrive. Shoot them with FIRE.',
  absorbed: 'Shots fired into a rift are lost. Wait until a creature is clear of it.',
  firstKill: 'Good. Each one you shoot weakens the rift.',
  unlocked: 'The rift is weak. Aim at it and hold SEAL.',
  locked: 'Too strong. Shoot its creatures first.',
  blocked: 'Something is arriving. Wait for it, then seal.',
};

// Lays out level n. Returns:
//   rifts   in the order they open. Fields: at (seconds into the level; rifts sharing a time
//           open together), dim, yaw / pitch in degrees relative to where the player is facing
//           as the level starts (omitted for a random bearing), width (starting width 0-1),
//           growth, maxWidth, lockKills (overrides the dimension's hold), pack ([min, max]
//           override), size, boss, quiet, waitSeen (stays a crack until the player looks at it)
//   types   the creatures that may appear (null for all of them)
//   fresh   creatures to introduce on the level card
//   hints, noDrops, boss
export function levelDef(n) {
  const boss = n % 5 === 0;
  const dims = DIM_ORDER.slice(0, Math.min(4, n));
  const types = n >= 4 ? null : Object.keys(FRESH).filter(k => k <= n).flatMap(k => FRESH[k]);
  const def = { n, boss, types, fresh: FRESH[n] || [], hints: n === 1 ? TUTORIAL : null, noDrops: n === 1 };

  if (n === 1) {
    // One rift, off to the side so the arrow has something to teach.
    def.rifts = [{ at: 1.5, dim: 'vesh', yaw: 50, pitch: 2, maxWidth: 0.6, lockKills: 4, pack: [3, 3], waitSeen: true }];
    return def;
  }

  const rifts = def.rifts = [];
  const gap = Math.max(5, 15 - n);
  let at = 3;
  if (boss) {
    // The big one, dead ahead, with ordinary rifts opening around the room while it is fought.
    rifts.push({ at, dim: 'unknown', yaw: 0, pitch: 3, width: 0.4, growth: 4, size: 1.6, boss: true, quiet: true });
    at = 18;
  }
  const count = boss ? Math.min(10, 2 + 2 * Math.floor(n / 5)) : Math.min(14, 4 + n);
  for (let i = 0; i < count; i++) {
    // A level opens with the dimension it is introducing, somewhere in front of the player.
    const first = i === 0 && !boss;
    rifts.push({
      at,
      dim: first ? dims[dims.length - 1] : dims[(Math.random() * dims.length) | 0],
      ...(first ? { yaw: rand(-50, 50) } : {}),
    });
    // From level 3, rifts open in pairs.
    if (n < 3 || i % 2) at += boss ? gap * 2 : gap;
  }
  return def;
}
