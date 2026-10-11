// Tracker-style sequencer: four synth voices (bass, arpeggio, lead, drums) playing patterns
// written as note data. Layers and tempo follow how wide the rifts are, and the lead plays the
// motif of whichever dimension is most open. Music is never panned.

import { audio, noise, tone } from './sfx.js';

export const music = { mode: 'off', level: 0, motif: null, enabled: true };

// Song data. Sixteen steps to the bar, four bars to the loop, in A minor.
const PROG = [0, 0, -4, -2];                              // bar roots, semitones from A: Am Am F G
const CHORD = [[0, 3, 7, 12], [0, 3, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12]];
const parse = s => s.replace(/\|/g, ' ').trim().split(/\s+/).map(t => (t === '.' ? null : t === '-' ? '-' : +t));
const BASS = parse('0 . . 0 . . 0 . 12 . . 0 . 7 . 12');   // semitones above the bar root
const ARP = parse('0 1 2 3 2 1 0 1 2 3 2 1 0 2 1 3');      // chord tone indices
const KICK = ['x...x...x...x...', 'x..x..x.x..x..x.'];
const SNARE = '....x.......x...';

// One two-bar motif per dimension: semitones from A, '-' holds the previous note, '.' rests.
const MOTIFS = {
  vesh: { oct: 0, ratio: 3, index: 1.5, len: 0.8,
    notes: parse('12 . 15 12 . 10 12 . 15 . 17 15 . 12 10 . | 12 . 15 12 . 10 12 . 19 . 17 15 . 12 . .') },
  ulta: { oct: -1, ratio: 0.5, index: 4, len: 1,
    notes: parse('0 - - - - - 3 - 5 - - - 3 - - - | 0 - - - - - -2 - 0 - - - - - . .') },
  hollow: { oct: 0, ratio: 3.5, index: 3, len: 2.5,
    notes: parse('19 - - . . . . . 13 - - . . . . . | 18 - - . . . 12 - - . . . . . . .') },
  miridian: { oct: 0, ratio: 1, index: 2, len: 0.9,
    notes: parse('7 10 7 10 . . 8 . 7 10 7 10 . . 5 . | 7 10 7 10 . . 8 . 12 . 10 . 7 . . .') },
  unknown: { oct: -1, ratio: 1.5, index: 5, len: 1,
    notes: parse('0 . 0 1 0 . . . 0 . 0 1 0 . 6 - | 0 . 0 1 0 . . . 12 - 13 - 12 - 6 -') },
};

const hz = midi => 440 * 2 ** ((midi - 69) / 12);
let step = 0, nextTime = 0, timer = null;

const tempo = () => (music.mode === 'menu' ? 84 : 100 + music.level * 9);

function schedule(s, t, sd) {
  const dest = audio.music;
  const bar = (s >> 4) & 3, i = s & 15, root = PROG[bar];
  const L = music.mode === 'menu' ? -1 : music.level;

  const b = BASS[i];
  if (b !== null && (L >= 1 || i % 8 === 0)) {
    tone({ at: t, f: hz(45 + root + b), dur: sd * 1.8, type: 'sawtooth', vol: 0.2, lp: 700, dest });
    tone({ at: t, f: hz(57 + root + b), dur: sd * 1.2, type: 'square', vol: 0.05, lp: 1200, dest });
  }
  if (L >= 2 || (L === -1 && i % 2 === 0)) {
    tone({ at: t, f: hz(69 + root + CHORD[bar][ARP[i]]), dur: sd * 0.9, type: 'square', vol: L === -1 ? 0.035 : 0.05, lp: 2600, dest });
  }
  if (L >= 1 && music.motif) {
    const m = MOTIFS[music.motif], n = m.notes, j = s % n.length;
    if (typeof n[j] === 'number') {
      let hold = 1;
      while (n[(j + hold) % n.length] === '-' && hold < 16) hold++;
      tone({ at: t, f: hz(69 + m.oct * 12 + n[j]), dur: sd * hold * m.len, vol: 0.11, attack: 0.01,
        mod: { ratio: m.ratio, index: m.index, index2: m.index * 0.2 }, dest });
    }
  }
  if (L >= 0) {
    const hat = L >= 3 ? true : L === 2 ? i % 2 === 0 : i % 4 === 2;
    if (hat) noise({ at: t, dur: 0.03, vol: i % 4 === 2 ? 0.09 : 0.05, f: 7000, dest });
    if (L >= 1 && KICK[L >= 3 ? 1 : 0][i] === 'x') tone({ at: t, f: 150, f2: 45, dur: 0.13, vol: 0.5, dest });
    if (L >= 2 && SNARE[i] === 'x') {
      noise({ at: t, dur: 0.12, vol: 0.22, filter: 'bandpass', f: 1800, dest });
      tone({ at: t, f: 190, f2: 120, dur: 0.08, type: 'triangle', vol: 0.15, dest });
    }
  }
}

// Schedule a little ahead of the audio clock so timing does not depend on frame rate.
function pump() {
  const ctx = audio.ctx;
  if (!ctx || music.mode === 'off' || !music.enabled || ctx.state !== 'running') return;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.15) {
    const sd = 60 / tempo() / 4;
    schedule(step, nextTime, sd);
    nextTime += sd;
    step = (step + 1) % 64;
  }
}

export function setMusicMode(mode) {
  if (mode !== music.mode && mode !== 'off') step = 0;
  music.mode = mode;
  if (!timer) timer = setInterval(pump, 30);
}

// level 0-3 from the game; motif is a dimension key or null.
export function setIntensity(level, motif) {
  music.level = level;
  music.motif = motif;
}
