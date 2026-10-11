// Creature registry, plus the catalogue entries the scanner shows in briefings.

import { Yrrk, Spawnling } from './yrrk.js';
import { Glomm } from './glomm.js';
import { Skaith } from './skaith.js';
import { Ootheen } from './ootheen.js';
import { Ummagog } from './ummagog.js';

export const CREATURES = {
  yrrk: Yrrk,
  spawnling: Spawnling,
  glomm: Glomm,
  skaith: Skaith,
  ootheen: Ootheen,
  ummagog: Ummagog,
};

export const CATALOGUE = {
  yrrk:    { name: 'Yrrk',         dim: 'vesh',     sprite: 'yrrk',    hp: 1,  note: 'Arrives in groups' },
  glomm:   { name: 'Glomm',        dim: 'ulta',     sprite: 'glomm',   hp: 2,  note: 'Widens its rift' },
  skaith:  { name: 'Skaith',       dim: 'hollow',   sprite: 'skaith',  hp: 3,  note: 'Moves when unseen' },
  ootheen: { name: 'Ootheen',      dim: 'miridian', sprite: 'ootheen', hp: 1,  note: 'Dislikes being aimed at' },
  ummagog: { name: 'The Ummagog',  dim: 'unknown',  sprite: 'core',    hp: 30, note: 'Three weak points' },
};
