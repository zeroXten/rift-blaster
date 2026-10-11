// Incident definitions and per-dimension spawn rules. Data only: adding an incident or
// retuning a dimension should not need changes to game logic.
//
// Rift fields: at (seconds into the incident; rifts sharing a time open together), dim, yaw / pitch in degrees relative to where the
// player faces at the start (omit for a random bearing), width (starting width 0-1), growth
// (multiplier on widening), maxWidth, lockKills (creatures to shoot before it can be sealed),
// pack ([min, max] override), size, boss, quiet.
//
// hints: scanner lines forced on the first occurrence of a game event.

export const DIM_SPAWN = {
  // interval / pack / max are [tear, breach]. max caps creatures alive from one rift.
  vesh:     { type: 'yrrk',    interval: [9, 6],  pack: [[3, 4], [4, 5]], max: [10, 14] },
  ulta:     { type: 'glomm',   interval: [5, 3],  pack: [[1, 1], [1, 1]], max: [1, 2] },
  hollow:   { type: 'skaith',  interval: [11, 7], pack: [[1, 1], [1, 1]], max: [2, 3] },
  miridian: { type: 'ootheen', interval: [9, 6],  pack: [[1, 1], [1, 1]], max: [2, 3] },
};

export const INCIDENTS = [
  {
    name: 'First Contact',
    creature: 'yrrk',
    briefing: [
      'Incident one. A rift has opened in your immediate vicinity. This is normal now.',
      'Things called Yrrks will come through it. Small. Numerous. Catalogue entry: avoid.',
      'Follow the arrow to the rift. Tap to shoot. I need six samples. Then hold the crosshair on the rift for two seconds and I will seal it.',
    ],
    damageScale: 0.5,
    rifts: [
      { at: 0.5, dim: 'vesh', yaw: 55, pitch: 2, width: 0.12, growth: 0.8, maxWidth: 0.6, lockKills: 6, pack: [3, 3] },
    ],
    hints: {
      start: 'Rift detected. Follow the arrow.',
      riftSeen: 'That crack is a rift. I need six samples before I can seal it.',
      locked: 'Not yet. Six samples first. Shoot what comes out.',
      tear: "It's tearing. Things will come through. Tap to shoot them.",
      firstKill: 'Good. Five more.',
      unlocked: 'Samples logged. Hold the crosshair on the rift to seal it.',
      blocked: "Can't seal while something is coming through. Shoot it.",
    },
  },
  {
    name: 'Widening',
    creature: 'glomm',
    briefing: [
      'Several rifts this time. An ignored rift widens: crack, tear, breach. Seal them while they are cracks.',
      'Violet rifts lead to Ulta-9. Glomms live there. A Glomm grips the edge of its rift and pulls it wider.',
      'Shoot it off. Two shots. Shooting anything while it is still squeezing through knocks it back and narrows the rift.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'vesh', yaw: -45 },
      { at: 8, dim: 'ulta' },
      { at: 28, dim: 'vesh' },
      { at: 28, dim: 'ulta' },
      { at: 50, dim: 'vesh' },
      { at: 62, dim: 'ulta' },
    ],
  },
  {
    name: "Don't Look Away",
    creature: 'skaith',
    briefing: [
      'Cold white rifts lead to The Hollow. Skaiths come from there.',
      'A Skaith only moves when you are not looking at it. Three shots.',
      'Keep turning. I would watch your back, but I was not fitted with a rear sensor.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'hollow', yaw: 30 },
      { at: 8, dim: 'vesh' },
      { at: 26, dim: 'hollow' },
      { at: 26, dim: 'ulta' },
      { at: 46, dim: 'hollow' },
      { at: 66, dim: 'vesh' },
      { at: 66, dim: 'hollow' },
    ],
  },
  {
    name: 'It Sees You',
    creature: 'ootheen',
    briefing: [
      'Amber rifts lead to Miridian. An Ootheen is an eye. It stares, and the staring hurts.',
      'It relocates if you hold the crosshair on it for more than 0.8 seconds. Shoot first. Think never. You are suited.',
      'Everything else you have met is also attending.',
    ],
    maxOpen: 3,
    rifts: [
      { at: 1, dim: 'miridian', yaw: -30 },
      { at: 7, dim: 'vesh' },
      { at: 24, dim: 'hollow' },
      { at: 24, dim: 'miridian' },
      { at: 44, dim: 'ulta' },
      { at: 60, dim: 'miridian' },
      { at: 60, dim: 'hollow' },
      { at: 80, dim: 'vesh' },
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
