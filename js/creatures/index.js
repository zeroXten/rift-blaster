// Creature registry, plus the catalogue entries shown on the card that introduces a level.

import { Yrrk, Spawnling } from './yrrk.js';
import { Zik } from './zik.js';
import { Glomm } from './glomm.js';
import { Brakk } from './brakk.js';
import { Skaith } from './skaith.js';
import { Fael } from './fael.js';
import { Ootheen } from './ootheen.js';
import { Thrum } from './thrum.js';
import { Ummagog } from './ummagog.js';

export const CREATURES = {
  yrrk: Yrrk,
  spawnling: Spawnling,
  zik: Zik,
  glomm: Glomm,
  brakk: Brakk,
  skaith: Skaith,
  fael: Fael,
  ootheen: Ootheen,
  thrum: Thrum,
  ummagog: Ummagog,
};

export const CATALOGUE = {
  yrrk:    { name: 'Yrrk',         dim: 'vesh',     sprite: 'yrrk',    hp: 1,  note: 'Arrives in groups' },
  zik:     { name: 'Zik',          dim: 'vesh',     sprite: 'zik',     hp: 1,  note: 'Tiny, fast, erratic' },
  glomm:   { name: 'Glomm',        dim: 'ulta',     sprite: 'glomm',   hp: 2,  note: 'Widens its rift' },
  brakk:   { name: 'Brakk',        dim: 'ulta',     sprite: 'brakk',   hp: 5,  note: 'Slow and armoured' },
  skaith:  { name: 'Skaith',       dim: 'hollow',   sprite: 'skaith',  hp: 3,  note: 'Moves when unseen' },
  fael:    { name: 'Fael',         dim: 'hollow',   sprite: 'fael',    hp: 1,  note: 'Solid half the time' },
  ootheen: { name: 'Ootheen',      dim: 'miridian', sprite: 'ootheen', hp: 1,  note: 'Dislikes being aimed at' },
  thrum:   { name: 'Thrum',        dim: 'miridian', sprite: 'thrum',   hp: 1,  note: 'Warns, then charges' },
  ummagog: { name: 'The Ummagog',  dim: 'unknown',  sprite: 'core',    hp: 30, note: 'Three weak points' },
};
