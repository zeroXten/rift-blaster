// The Scanner: the game's only character. Every line it can say lives here.
// Mid-game remarks are one line at a time and rate-limited; anything longer belongs between rounds.

export const LINES = {
  permission: ["I need your camera. I can't see without it."],

  riftOpen: ['New rift. Follow the arrow.', 'Another one. They do that.', 'Rift opening. Do keep up.', 'Fresh rift. Somewhere that is not where you are looking.'],
  riftBehind: ['Breach at your six. That means behind you.', 'Behind you. No. The other behind.', 'New rift. Turn around. All the way.'],
  tear: ["It's tearing. Something is pushing.", 'Membrane failing. As predicted.', "Something came through. I'd describe it, but you'd only worry."],
  breach: ['Full breach. I did say seal it.', "It's wide open now. Well done.", 'Breach. They will be bigger now.'],
  sealed: ['Sealed. Adequate.', 'Rift closed. One fewer.', 'Sealed. I did most of that.', 'Closed. Reality thanks you. I do not.'],
  blocked: ["Can't seal. Something's in the doorway.", 'Shoot what is coming through. Then seal.'],

  streak: ['Acceptable shooting.', 'You hit several things. Noted.', 'Keep doing that.'],
  miss: ['That was a wall.', 'The crosshair is the bit in the middle.', "Missed. I'll adjust my expectations.", 'You are shooting furniture.'],
  overheat: ['I am overheating. I did mention the trigger discipline.', 'Too hot. I refuse to fire.', 'Cooling. Entertain yourself.'],
  damage: ["That was you. You're leaking reality.", 'Something reached you. Try not to let them.', 'Integrity dropping. Yours, not mine.', 'It bit you. I felt nothing.'],
  low: ["Reality is below thirty percent. I'd hurry.", 'Integrity critical. I will be fine, for the record.'],
  recal: ["Fine. I've lost track of the room. Recalibrating.", 'Re-zeroing. The room moved. Probably.', 'Recalibrated. This is now forwards.'],

  glomm: ["Glomm on the rift. It's pulling. Shoot it off.", 'A Glomm. It is widening the rift. Two shots.'],
  skaith: ["Skaith. It moves when you don't look. So look.", 'Skaith. Do not look away. Or do. Your choice.'],
  ootheen: ['Ootheen. It is looking at you. Shoot it quickly.', 'An eye. It stares. It hurts. Be fast.'],
  ootheenJump: ['It saw you aiming. Be quicker.', 'Ootheen relocated. It does that.', 'Too slow. It moved.'],

  bossRise: ['That is the Ummagog. Do not be alarmed. Be accurate.'],
  bossWeak: ['Weak point exposed. The glowing one.', 'Another weak point. Shoot the glow.'],
  bossArmour: ["That's armour. Shoot the glowing part.", 'Armour. You are wasting heat.'],
  bossPod: ['One down. It noticed.', 'Weak point destroyed. It is upset.'],
  bossStun: ["It's stunned. Seal the rift. Now would be good."],
  bossRecover: ["It's getting up. You had one job."],

  win: ['Incident contained.'],
  gameover: [
    'Reality has failed at your location. I will log it as user error.',
    'You have been compromised. I am unaffected, thank you for asking.',
    'That went as well as I calculated. I calculated badly on purpose.',
  ],
  victory: ['All rifts sealed. The incident is closed. You were present for it.'],
  upgrade: ['I am permitted to improve myself between incidents. Pick one. I would pick all three.'],
};

// The performance review.
export const GRADES = {
  S: ['Flawless. I assume I was carrying you.', 'No notes. This is suspicious.'],
  A: ['Competent. I am as surprised as you are.', 'Good. Do not let it change you.'],
  B: ['Adequate. Reality survived, loosely.', 'Fine. I have seen worse. I have seen it from you.'],
  C: ['The rifts are sealed. That is the kindest thing I can say.', 'You were the unreliable component. Again.'],
  D: ['Technically a success. I will be reviewing the word technically.', 'We survived. I use the word we generously.'],
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
