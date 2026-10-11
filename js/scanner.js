// The Scanner: the game's only character. Every line it can say lives here.
// It is terse and matter-of-fact: it reports, it instructs, and it very occasionally lets
// slip that it is unimpressed. One line at a time, a few words, rate-limited.

export const LINES = {
  permission: ["I need your camera. I can't see without it."],

  riftOpen: ['New rift. Follow the arrow.', 'Another rift.', 'Rift detected.'],
  riftBehind: ['Rift behind you.', 'New rift. Turn around.'],
  tear: ['Rift open. Incoming.', 'It is open. Here they come.'],
  breach: ['That rift is wide open now.', 'Rift at full width. Expect more of them.'],
  sealed: ['Sealed.', 'Rift closed.', 'Sealed. Next.'],
  locked: ['Too strong to seal. Shoot its creatures first.', 'Not yet. Weaken it first.'],
  weak: ['That rift is weak. Hold SEAL on it.', 'Weak enough. Seal it.'],
  absorbed: ['Shots into a rift are lost.', 'Wait until it is clear of the rift.'],
  blocked: ['Something is arriving. Wait, then seal.'],

  streak: ['Good shooting.', 'Keep that up.'],
  miss: ['Missed.', 'Nothing there.'],
  overheat: ['Overheated. Cooling.', 'Too hot. Wait.'],
  damage: ['You are hit.', 'One reached you.', 'Integrity dropping.'],
  low: ['Integrity below thirty percent.'],
  recal: ['Recalibrated.'],

  glomm: ['Glomm on the rift. It is widening it.', 'A Glomm. Shoot it off. Two shots.'],
  skaith: ['Skaith. It only moves when you look away.', 'Skaith. Keep it in view.'],
  ootheen: ['Ootheen. Shoot it quickly, or it moves.'],
  ootheenJump: ['It moved.', 'Too slow. It jumped.'],
  brakk: ['Brakk. Armoured. Five shots.', 'A Brakk. Start shooting.'],
  thrum: ['Thrum. It is about to charge.', 'That one charges. Shoot it first.'],

  drop: ['Power-up. Shoot it to collect it.'],
  got: ['Collected. Use it from the left side.', 'Collected.'],
  empty: ['None of those left.'],
  full: ['Integrity is already full.'],
  rapid: ['Rapid fire. Hold FIRE.'],
  health: ['Integrity restored.'],
  nova: ['Grenade away.'],
  stasis: ['Stasis field. They are held.'],
  charge: ['Rift charge armed. Shoot a rift.'],
  chargeUsed: ['Rift collapsed.'],

  bossRise: ['The Ummagog. Shoot its weak points when they glow.'],
  bossWeak: ['Weak point exposed.', 'Another weak point. Shoot the glow.'],
  bossArmour: ['That is armour. Shoot the glowing part.'],
  bossPod: ['Weak point destroyed.'],
  bossStun: ['It is stunned. Seal its rift now.'],
  bossRecover: ['It is back up.'],

  gameover: ['Reality integrity lost.', 'That is the end of this run.', 'Integrity gone. I did warn you.'],
};

class Scanner {
  constructor() {
    this.text = '';
    this.ttl = 0;       // seconds the current line stays on screen
    this.cool = 0;      // seconds until an unforced remark may replace it
    this.voice = true;
    this.last = {};
    this.voiceObj = null;
  }

  // Say a random line from a category. Unforced remarks are dropped while the scanner is still talking.
  say(key, force = false) {
    const pool = LINES[key];
    if (!pool || (!force && this.cool > 0)) return;
    let i;
    do { i = (Math.random() * pool.length) | 0; } while (pool.length > 1 && i === this.last[key]);
    this.last[key] = i;
    this.show(pool[i], force);
  }

  show(text, force = false) {
    this.text = text;
    this.ttl = Math.max(3, text.length * 0.075);
    this.cool = force ? 3.5 : 6;
    this.speak(text);
  }

  update(dt) {
    this.ttl -= dt;
    this.cool -= dt;
  }

  clear() {
    this.ttl = 0;
    this.cool = 0;
  }

  // Browser speech synthesis: robotic, which suits.
  speak(text) {
    const synth = window.speechSynthesis;
    if (!this.voice || !synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      this.voiceObj ||= synth.getVoices().find(v => /^en[-_]GB/i.test(v.lang)) || synth.getVoices().find(v => /^en/i.test(v.lang)) || null;
      if (this.voiceObj) u.voice = this.voiceObj;
      u.rate = 1.05;
      u.pitch = 0.6;
      synth.speak(u);
    } catch { /* speech is a nicety */ }
  }

  hush() {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }

  // iOS only lets speech start from a tap; an empty utterance on the Start tap unlocks it.
  unlock() {
    try {
      const synth = window.speechSynthesis;
      if (synth) { synth.getVoices(); synth.speak(new SpeechSynthesisUtterance('')); }
    } catch { /* ignore */ }
  }
}

export const scanner = new Scanner();
