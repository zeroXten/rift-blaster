// Incident definitions and per-dimension spawn rules. Data only: adding an incident or
// retuning a dimension should not need changes to game logic.
//
// Rift fields: at (seconds into the incident; rifts sharing a time open together), dim, yaw / pitch in degrees relative to where the
// player faces at the start (omit for a random bearing), width (starting width 0-1), growth
// (multiplier on widening), maxWidth, lockKills (creatures to shoot before it can be sealed;
// defaults to the dimension's hold), pack ([min, max] override), size, boss, quiet, waitSeen
// (stays a crack until the player has looked at it).
//
// hints: scanner lines forced on the first occurrence of a game event.

export const DIM_SPAWN = {
  // interval / pack / max are [tear, breach]. max caps creatures alive from one rift.
  // hold is how many of its creatures must be shot before a rift of that dimension will seal.
  vesh:     { type: 'yrrk',    interval: [7, 5.5], pack: [[3, 3], [3, 4]], max: [8, 10],  hold: 5 },
  ulta:     { type: 'glomm',   interval: [4, 4],   pack: [[1, 1], [1, 1]], max: [1, 2],   hold: 2 },
  hollow:   { type: 'skaith',  interval: [7, 5],   pack: [[1, 1], [1, 1]], max: [2, 3],   hold: 2 },
  miridian: { type: 'ootheen', interval: [5, 4],   pack: [[1, 1], [1, 1]], max: [1, 2],   hold: 2 },
};

export const INCIDENTS = [
  {
    name: 'First Contact',
    creature: 'yrrk',
    briefing: [
      'Incident one. A rift has opened in your immediate vicinity. This is normal now.',
      'Things called Yrrks will come through it. Small. Numerous. Catalogue entry: avoid.',
      'Follow the arrow to the rift. Fire with your right thumb. I need six samples. Then hold the crosshair on the rift for two seconds and I will seal it.',
    ],
    rifts: [
      { at: 0.5, dim: 'vesh', yaw: 55, pitch: 2, maxWidth: 0.6, lockKills: 6, pack: [3, 3], waitSeen: true },
    ],
    hints: {
      start: 'Rift detected. Follow the arrow.',
      riftSeen: 'That crack is a rift. I need six samples before I can seal it.',
      locked: 'Not yet. Six samples first. Shoot what comes out.',
      tear: "It's tearing. Here they come. Shoot them.",
      firstKill: 'Good. Five more.',
      unlocked: 'Samples logged. Hold the crosshair on the rift to seal it.',
      blocked: "Can't seal while something is coming through. Shoot it.",
    },
  },
  {
    name: 'Widening',
    creature: 'glomm',
    briefing: [
      'Several rifts this time. Each is held open from the other side. Shoot enough of what comes through, then hold the crosshair on it to seal it. The pips under a rift count what is left.',
      'Violet rifts lead to Ulta-9. Glomms live there. A Glomm grips the edge of its rift and pulls it wider.',
      'Shoot it off. Two shots. A rift left alone widens: crack, tear, breach. Wider means more of them, faster.',
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
    creature: 'skaith',
    briefing: [
      'Cold white rifts lead to The Hollow. Skaiths come from there.',
      'A Skaith only moves when you are not looking at it. Three shots.',
      'Keep turning. I would watch your back, but I was not fitted with a rear sensor.',
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
    creature: 'ootheen',
    briefing: [
      'Amber rifts lead to Miridian. An Ootheen is an eye. It stares, and the staring hurts.',
      'It relocates if you hold the crosshair on it for more than 0.8 seconds. Shoot first. Think never. You are suited.',
      'Everything else you have met is also attending.',
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
