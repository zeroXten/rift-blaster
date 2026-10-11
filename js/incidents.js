// Incident definitions and per-dimension spawn rules. Data only: adding an incident or
// retuning a dimension should not need changes to game logic.
//
// Rift fields: at (seconds into the incident; rifts sharing a time open together), dim, yaw / pitch in degrees relative to where the
// player faces at the start (omit for a random bearing), width (starting width 0-1), growth
// (multiplier on widening), maxWidth, lockKills (creatures to shoot before it can be sealed;
// defaults to the dimension's hold), pack ([min, max] override), size, boss, quiet, waitSeen
// (stays a crack until the player has looked at it).
//
// Incident fields: creature (what the briefing's catalogue card shows; a list is cycled),
// types (the creatures that may appear; omit for all of them), noDrops (no power-ups),
// hints (scanner lines forced on the first occurrence of a game event).

export const DIM_SPAWN = {
  // interval and max are [tear, breach]. max caps creatures alive from one rift.
  // hold is how many of its creatures must be shot before a rift of that dimension will seal.
  // spawns lists what can come through: pack is the group size as [tear, breach] ranges,
  // weight is how often it is chosen, limit caps how many of that type the rift has out at once.
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

export const INCIDENTS = [
  {
    name: 'First Contact',
    creature: 'yrrk',
    types: ['yrrk'],
    noDrops: true,
    briefing: [
      'Incident one. A rift has opened in your immediate vicinity. This is normal now.',
      'Things called Yrrks will come through it. Small. Numerous. Catalogue entry: avoid.',
      'Follow the arrow to the rift. Fire with your right thumb. The rift is held open from the other side, and it swallows shots. Wait until they are out, then shoot them. Each one weakens it. When the bar under it is empty, hold the crosshair on the rift and I will seal it.',
    ],
    rifts: [
      { at: 0.5, dim: 'vesh', yaw: 55, pitch: 2, maxWidth: 0.6, lockKills: 6, pack: [3, 3], waitSeen: true },
    ],
    hints: {
      start: 'Rift detected. Follow the arrow.',
      riftSeen: 'That crack is a rift. It is too strong to seal yet.',
      locked: 'Too strong. Shoot what comes out of it and it weakens.',
      tear: "It's tearing. Here they come. Shoot them.",
      firstKill: 'Good. It felt that. Keep going.',
      unlocked: 'It is weak enough. Hold the crosshair on the rift to seal it.',
      blocked: "Can't seal while something is halfway through. Let it out first.",
      absorbed: 'The rift swallows anything fired into it. Wait until they are fully out, then shoot.',
    },
  },
  {
    name: 'Widening',
    creature: ['glomm', 'zik'],
    types: ['yrrk', 'zik', 'glomm'],
    briefing: [
      'Several rifts this time. Each is held open from the other side. Shoot what comes through and it weakens. When its bar is empty, hold the crosshair on it to seal it.',
      'Violet rifts: Glomms. A Glomm grips the edge of its rift and pulls it wider. Two shots. Green rifts now also leak Ziks: tiny, fast, erratic.',
      'Sometimes they drop equipment. Shoot it to take it.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'vesh', yaw: -45 },
      { at: 12, dim: 'ulta' },
      { at: 30, dim: 'vesh' },
      { at: 30, dim: 'ulta' },
      { at: 52, dim: 'vesh' },
      { at: 62, dim: 'ulta' },
    ],
  },
  {
    name: "Don't Look Away",
    creature: ['skaith', 'brakk'],
    types: ['yrrk', 'zik', 'glomm', 'brakk', 'skaith'],
    briefing: [
      'Cold white rifts lead to The Hollow. A Skaith only moves when you are not looking at it. Three shots. Keep turning.',
      'Ulta-9 has also sent Brakks. Slow. Armoured. Five shots. Do not let one arrive.',
      'I would watch your back, but I was not fitted with a rear sensor.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'hollow', yaw: 30 },
      { at: 5, dim: 'vesh' },
      { at: 22, dim: 'hollow' },
      { at: 22, dim: 'ulta' },
      { at: 40, dim: 'hollow' },
      { at: 54, dim: 'vesh' },
      { at: 54, dim: 'hollow' },
    ],
  },
  {
    name: 'It Sees You',
    creature: ['ootheen', 'thrum', 'fael'],
    briefing: [
      'Amber rifts lead to Miridian. An Ootheen is an eye. Its stare hurts, and it jumps away if you aim at it for too long. Shoot fast.',
      'Thrums paw the ground, then charge. One shot stops them, if you are quick.',
      'The Hollow now sends Faels too. They are only solid half the time.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'miridian', yaw: -30 },
      { at: 5, dim: 'vesh' },
      { at: 20, dim: 'hollow' },
      { at: 20, dim: 'miridian' },
      { at: 38, dim: 'ulta' },
      { at: 52, dim: 'miridian' },
      { at: 52, dim: 'hollow' },
      { at: 66, dim: 'vesh' },
    ],
  },
  {
    name: 'The Big One',
    creature: 'ummagog',
    briefing: [
      'A large rift. Dimension unknown. Occupant: the Ummagog. Catalogue entry: three exclamation marks.',
      'It has three weak points. They open one at a time. Shoot the glowing one. The rest is armour.',
      'When it is stunned, seal its rift. Not before. I will not let you. Not after. It gets up.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'unknown', yaw: 0, pitch: 3, width: 0.4, growth: 4, size: 1.6, boss: true, quiet: true },
      { at: 20, dim: 'vesh' },
      { at: 50, dim: 'hollow' },
      { at: 80, dim: 'miridian' },
      { at: 110, dim: 'ulta' },
    ],
  },
];
