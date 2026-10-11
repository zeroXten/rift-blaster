// Dimensions and what lives in them. Each rift leads to one dimension; its colour tells the
// player what is about to come through.

import { PAL } from './palette.js';

// ramp: four palette keys, dark -> highlight. Sprites refer to them as 1..4.
// spawn: per breach stage - seconds between arrivals, group size, and how many may be out at once.
export const DIMS = {
  vesh: {
    name: 'VESH', colour: 'ACID GREEN', creature: 'yrrk', ramp: ['a', 'b', 'c', 'e'],
    spawn: { tear: { every: 8, group: [3, 4], max: 8 }, breach: { every: 5.5, group: [4, 6], max: 12 } },
  },
  ulta: {
    name: 'ULTA-9', colour: 'VIOLET', creature: 'glomm', ramp: ['f', 'h', 'i', 'j'],
    spawn: { tear: { every: 7, group: [1, 1], max: 2 }, breach: { every: 5, group: [1, 1], max: 3 } },
  },
  hollow: {
    name: 'THE HOLLOW', colour: 'COLD WHITE', creature: 'skaith', ramp: ['m', 'n', 'o', 'p'],
    spawn: { tear: { every: 10, group: [1, 1], max: 2 }, breach: { every: 7, group: [1, 1], max: 3 } },
  },
  miridian: {
    name: 'MIRIDIAN', colour: 'AMBER', creature: 'ootheen', ramp: ['q', 'r', 's', 't'],
    spawn: { tear: { every: 7, group: [1, 1], max: 2 }, breach: { every: 4.5, group: [1, 2], max: 4 } },
  },
  unknown: {
    name: 'UNKNOWN', colour: 'RED', creature: 'ummagog', ramp: ['u', 'v', 'x', 'y'],
    spawn: null,
  },
};

for (const d of Object.values(DIMS)) d.colors = d.ramp.map(k => PAL[k]);

// Catalogue entries, shown on the briefing card when a creature is first introduced.
export const CATALOGUE = {
  yrrk: { name: 'YRRK', dim: 'vesh', sprite: 'yrrk', notes: ['HP 1', 'ARRIVES IN GROUPS'] },
  glomm: { name: 'GLOMM', dim: 'ulta', sprite: 'glomm', notes: ['HP 2', 'WIDENS ITS RIFT'] },
  skaith: { name: 'SKAITH', dim: 'hollow', sprite: 'skaith', notes: ['HP 3', 'MOVES WHEN UNSEEN'] },
  ootheen: { name: 'OOTHEEN', dim: 'miridian', sprite: 'ootheen', notes: ['HP 1', 'DISLIKES STARING'] },
  ummagog: { name: 'THE UMMAGOG', dim: 'unknown', sprite: 'ummaBody', notes: ['HP 30', '3 WEAK POINTS'] },
};
