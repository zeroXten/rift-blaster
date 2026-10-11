// Sound effects, synthesised with the Web Audio API: FM tones, sweeps and filtered noise
// in the manner of a Sound Blaster. No audio files.

import { clamp } from '../util.js';

export const audio = { ctx: null, sfx: null, music: null, noise: null };

const cur = { pan: 0, vol: 1 };
let sealOsc = null, sealGain = null;

// Must be called from a user gesture (the Start tap).
export function initAudio() {
  if (audio.ctx) { audio.ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = audio.ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  audio.sfx = ctx.createGain();
  audio.sfx.gain.value = 0.8;
  audio.sfx.connect(comp);
  audio.music = ctx.createGain();
  audio.music.gain.value = 0.45;
  audio.music.connect(comp);

  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio.noise = buf;
  ctx.resume?.();
}

function output(pan, dest) {
  const ctx = audio.ctx;
  if (!pan || !ctx.createStereoPanner) return dest;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(dest);
  return p;
}

// One oscillator with an optional FM modulator and lowpass.
// o: { f, f2, dur, type, vol, attack, delay, at, lp, mod: { ratio, index, index2 }, dest, pan }
export function tone(o) {
  const ctx = audio.ctx;
  const t0 = o.at ?? ctx.currentTime + (o.delay || 0), t1 = t0 + o.dur;
  const vol = (o.vol ?? 0.2) * (o.dest ? 1 : cur.vol);
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  if (o.mod) {
    const m = ctx.createOscillator(), mg = ctx.createGain();
    m.frequency.setValueAtTime(o.f * o.mod.ratio, t0);
    if (o.f2) m.frequency.exponentialRampToValueAtTime(o.f2 * o.mod.ratio, t1);
    mg.gain.setValueAtTime(o.f * o.mod.index, t0);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, o.f * (o.mod.index2 ?? 0.01)), t1);
    m.connect(mg).connect(osc.frequency);
    m.start(t0);
    m.stop(t1 + 0.05);
  }
  let node = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    node = osc.connect(f);
  }
  node.connect(g).connect(output(o.pan ?? (o.dest ? 0 : cur.pan), o.dest || audio.sfx));
  osc.start(t0);
  osc.stop(t1 + 0.05);
}

// Filtered white noise. o: { dur, vol, filter, f, f2, q, delay, at, dest, pan }
export function noise(o) {
  const ctx = audio.ctx;
  const t0 = o.at ?? ctx.currentTime + (o.delay || 0), t1 = t0 + o.dur;
  const vol = (o.vol ?? 0.2) * (o.dest ? 1 : cur.vol);
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || 'highpass';
  f.frequency.setValueAtTime(o.f || 1000, t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t1);
  f.Q.value = o.q || 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  src.connect(f).connect(g).connect(output(o.pan ?? (o.dest ? 0 : cur.pan), o.dest || audio.sfx));
  src.start(t0, Math.random() * 0.5);
  src.stop(t1 + 0.02);
}

const SOUNDS = {
  // Weapon
  shot() {
    tone({ f: 1500, f2: 160, dur: 0.11, type: 'square', vol: 0.13, mod: { ratio: 2.5, index: 2, index2: 0.2 } });
    noise({ dur: 0.04, vol: 0.1, f: 4000 });
  },
  hit() {
    tone({ f: 320, f2: 110, dur: 0.08, type: 'square', vol: 0.2 });
    noise({ dur: 0.06, vol: 0.2, filter: 'bandpass', f: 1200 });
  },
  denied() { tone({ f: 110, dur: 0.07, type: 'square', vol: 0.12 }); },
  overheat() {
    for (let i = 0; i < 3; i++) tone({ f: i % 2 ? 660 : 880, dur: 0.12, delay: i * 0.13, type: 'square', vol: 0.14 });
    noise({ dur: 1.4, vol: 0.14, f: 3000, delay: 0.1 });
  },
  // A shot swallowed by a rift: a dull gulp, nothing like a hit.
  absorb() {
    tone({ f: 240, f2: 60, dur: 0.28, vol: 0.22, mod: { ratio: 0.5, index: 3, index2: 0.5 } });
    noise({ dur: 0.18, vol: 0.12, filter: 'lowpass', f: 900, f2: 150 });
  },
  armour() { tone({ f: 1900, dur: 0.1, vol: 0.14, mod: { ratio: 1.41, index: 3, index2: 0.5 } }); },

  // One death per creature
  kill_yrrk() {
    tone({ f: 900, f2: 2400, dur: 0.1, vol: 0.16, mod: { ratio: 1.5, index: 4 } });
    tone({ f: 1800, f2: 300, dur: 0.12, delay: 0.09, vol: 0.14, mod: { ratio: 1.5, index: 3 } });
  },
  kill_spawnling() {
    tone({ f: 600, f2: 1500, dur: 0.1, vol: 0.16, mod: { ratio: 1.5, index: 4 } });
    tone({ f: 1100, f2: 180, dur: 0.14, delay: 0.09, vol: 0.14, mod: { ratio: 1.5, index: 3 } });
  },
  kill_glomm() {
    tone({ f: 180, f2: 50, dur: 0.38, type: 'sawtooth', vol: 0.22, mod: { ratio: 0.5, index: 6 } });
    noise({ dur: 0.25, vol: 0.2, filter: 'lowpass', f: 500 });
  },
  kill_skaith() {
    tone({ f: 2100, dur: 0.55, vol: 0.12, mod: { ratio: 3.01, index: 2 } });
    tone({ f: 3150, dur: 0.4, vol: 0.07 });
    noise({ dur: 0.08, vol: 0.18, f: 5000 });
  },
  kill_zik() { tone({ f: 2400, f2: 900, dur: 0.07, type: 'square', vol: 0.12 }); },
  kill_brakk() {
    noise({ dur: 0.4, vol: 0.3, filter: 'lowpass', f: 700, f2: 90 });
    tone({ f: 140, f2: 40, dur: 0.45, type: 'square', vol: 0.22, mod: { ratio: 0.5, index: 4 } });
  },
  kill_thrum() {
    tone({ f: 330, f2: 110, dur: 0.22, type: 'sawtooth', vol: 0.22, mod: { ratio: 1.5, index: 3 } });
    noise({ dur: 0.12, vol: 0.18, filter: 'bandpass', f: 900 });
  },
  kill_fael() {
    noise({ dur: 0.5, vol: 0.14, filter: 'bandpass', f: 3000, f2: 600, q: 5 });
    tone({ f: 1500, f2: 2600, dur: 0.3, vol: 0.07 });
  },
  kill_ootheen() {
    tone({ f: 600, f2: 1500, dur: 0.06, vol: 0.2 });
    tone({ f: 1200, f2: 200, dur: 0.22, delay: 0.05, type: 'triangle', vol: 0.18, mod: { ratio: 7, index: 1.5 } });
  },

  // Something pushing through, per dimension
  emerge_vesh() {
    for (let i = 0; i < 4; i++) tone({ f: 1200 + i * 130, f2: 1500, dur: 0.05, delay: i * 0.07, type: 'square', vol: 0.07 });
  },
  emerge_ulta() { tone({ f: 110, f2: 230, dur: 0.5, type: 'sawtooth', vol: 0.18, mod: { ratio: 0.5, index: 5 } }); },
  emerge_hollow() { noise({ dur: 0.9, vol: 0.12, filter: 'bandpass', f: 700, f2: 2600, q: 4 }); },
  emerge_miridian() { tone({ f: 520, dur: 0.6, vol: 0.14, mod: { ratio: 0.02, index: 0.5, index2: 0.5 } }); },
  emerge_unknown() {
    tone({ f: 55, f2: 80, dur: 0.6, type: 'sawtooth', vol: 0.22, mod: { ratio: 0.5, index: 8 } });
  },

  // Rift stages
  crack() {
    for (let i = 0; i < 4; i++) noise({ dur: 0.025, vol: 0.2, f: 5000, delay: i * 0.06 + Math.random() * 0.03 });
    tone({ f: 3000, f2: 2200, dur: 0.25, vol: 0.06 });
  },
  tear() {
    noise({ dur: 0.5, vol: 0.2, filter: 'bandpass', f: 400, f2: 3200, q: 2 });
    tone({ f: 200, f2: 90, dur: 0.45, type: 'sawtooth', vol: 0.12 });
  },
  breach() {
    tone({ f: 120, f2: 35, dur: 0.8, vol: 0.35 });
    noise({ dur: 0.6, vol: 0.25, filter: 'lowpass', f: 300 });
    tone({ f: 200, f2: 900, dur: 0.5, type: 'sawtooth', vol: 0.09, delay: 0.1 });
  },
  seal() {
    tone({ f: 1200, f2: 60, dur: 0.45, vol: 0.22, mod: { ratio: 2, index: 3 } });
    noise({ dur: 0.4, vol: 0.14, f: 2000, f2: 200 });
    tone({ f: 80, f2: 40, dur: 0.2, delay: 0.42, vol: 0.35 });
    tone({ f: 1760, dur: 0.5, delay: 0.5, vol: 0.1, mod: { ratio: 2, index: 1 } });
  },

  // Creature behaviours
  glare() { tone({ f: 400, f2: 1700, dur: 1.1, vol: 0.09, attack: 0.5, mod: { ratio: 1.01, index: 2, index2: 4 } }); },
  jump() {
    tone({ f: 1500, f2: 500, dur: 0.06, type: 'triangle', vol: 0.16 });
    tone({ f: 700, f2: 1900, dur: 0.07, delay: 0.07, type: 'triangle', vol: 0.16 });
  },
  step() {
    noise({ dur: 0.03, vol: 0.14, filter: 'bandpass', f: 2500, q: 3 });
    tone({ f: 90, f2: 60, dur: 0.06, vol: 0.14 });
  },
  podbreak() {
    noise({ dur: 0.5, vol: 0.3, filter: 'lowpass', f: 900, f2: 100 });
    tone({ f: 300, f2: 60, dur: 0.4, type: 'square', vol: 0.18 });
  },
  roar() {
    tone({ f: 75, f2: 45, dur: 1.0, type: 'sawtooth', vol: 0.3, mod: { ratio: 0.5, index: 10, index2: 3 } });
    noise({ dur: 0.9, vol: 0.14, filter: 'bandpass', f: 500, f2: 200 });
  },
  stun() {
    [880, 740, 587, 440, 330].forEach((f, i) => tone({ f, dur: 0.16, delay: i * 0.11, type: 'square', vol: 0.12 }));
  },

  // A Thrum winding up to charge
  windup() { tone({ f: 90, f2: 260, dur: 1.1, type: 'sawtooth', vol: 0.16, attack: 0.3, mod: { ratio: 0.5, index: 5, index2: 9 } }); },

  // Power-ups
  drop() {
    tone({ f: 1320, dur: 0.08, type: 'triangle', vol: 0.14 });
    tone({ f: 1760, dur: 0.14, delay: 0.08, type: 'triangle', vol: 0.14 });
  },
  pickup() {
    [660, 880, 1320, 1760].forEach((f, i) => tone({ f, dur: 0.12, delay: i * 0.05, type: 'square', vol: 0.12 }));
  },
  nova() {
    tone({ f: 160, f2: 30, dur: 0.9, vol: 0.4 });
    noise({ dur: 0.8, vol: 0.35, filter: 'lowpass', f: 2500, f2: 120 });
    tone({ f: 900, f2: 80, dur: 0.3, type: 'sawtooth', vol: 0.14 });
  },
  stasis() {
    [2093, 1568, 1175, 784].forEach((f, i) => tone({ f, dur: 0.5, delay: i * 0.09, vol: 0.09, mod: { ratio: 3.01, index: 1.5 } }));
  },

  // Player
  damage() {
    tone({ f: 160, f2: 50, dur: 0.3, type: 'sawtooth', vol: 0.3 });
    tone({ f: 233, f2: 120, dur: 0.25, type: 'square', vol: 0.12 });
    noise({ dur: 0.25, vol: 0.28, filter: 'lowpass', f: 700 });
  },
  recal() {
    tone({ f: 300, f2: 1200, dur: 0.15, type: 'triangle', vol: 0.14 });
    tone({ f: 1200, f2: 300, dur: 0.15, delay: 0.15, type: 'triangle', vol: 0.14 });
  },
  ui() { tone({ f: 660, dur: 0.05, type: 'square', vol: 0.1 }); },
  win() {
    [440, 554, 659, 880, 1109].forEach((f, i) => tone({ f, dur: 0.22, delay: i * 0.1, type: 'square', vol: 0.11 }));
  },
  lose() {
    tone({ f: 220, f2: 40, dur: 1.5, type: 'sawtooth', vol: 0.28, mod: { ratio: 1.02, index: 3 } });
    noise({ dur: 1.2, vol: 0.2, filter: 'lowpass', f: 1200, f2: 100 });
  },
};

// pan: -1 (left) to 1 (right), taken from the source's bearing.
export function play(name, pan = 0, vol = 1) {
  if (!audio.ctx) return;
  cur.pan = clamp(pan || 0, -1, 1);
  cur.vol = vol;
  SOUNDS[name]?.();
}

// Rising tone while a seal is in progress; pass 0 to silence it.
export function sealTone(progress) {
  const ctx = audio.ctx;
  if (!ctx) return;
  if (!sealOsc) {
    if (!progress) return;
    sealOsc = ctx.createOscillator();
    sealOsc.type = 'square';
    sealGain = ctx.createGain();
    sealGain.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    sealOsc.connect(f).connect(sealGain).connect(audio.sfx);
    sealOsc.start();
  }
  const t = ctx.currentTime;
  sealGain.gain.setTargetAtTime(progress ? 0.05 : 0, t, 0.03);
  if (progress) sealOsc.frequency.setTargetAtTime(280 + 900 * progress, t, 0.03);
}
