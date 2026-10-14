// The Scanner: the game's only character. Every line it can say lives here.
// It is terse and matter-of-fact: it reports, it instructs, and it very occasionally lets
// slip that it is unimpressed. One line at a time, a few words, rate-limited.
//
// A category is either a list of lines, or { first, then, often }: `first` is said the first
// time in a run, and explains; after that the lines come from `then`, which only remark, and
// only with chance `often` (default 1), so routine events stop being narrated every time.
// A category with an `…Auto` twin uses that instead on the setting where rifts close themselves.
// Within a category every line is used once before any repeats.

import { level } from './config.js';

export const LINES = {
  permission: ["I need your camera. I can't see without it."],

  riftOpen: {
    first: ['New rift. Follow the arrow.'],
    then: ['Another rift.', 'Rift detected.', 'Rift. Over there.', 'And another.', 'Fresh rift.', 'More company.',
      'They have found another door.', 'Rift. Same as the last one, somewhere else.', 'Rift opening.'],
    often: 0.7,
  },
  riftBehind: {
    first: ['Rift behind you. Turn around.'],
    then: ['Behind you.', 'Rift at your back.', 'Check behind you.', 'Something opened behind you.', 'Rift, rear.'],
  },
  tear: {
    first: ['Rift open. Incoming.'],
    then: ['Here they come.', 'It is open.', 'Incoming.', 'Movement in the rift.', 'Visitors.', 'Arrivals.'],
    often: 0.5,
  },
  breach: {
    first: ['That rift is wide open now. Expect more of them.'],
    then: ['Rift at full width.', 'That one has opened right up.', 'Wide open. Busy, then.', 'Full width. Plenty of room for them.'],
    often: 0.7,
  },
  sealed: {
    first: ['Sealed.'],
    then: ['Sealed.', 'Rift closed.', 'Closed. Next.', 'That one is shut.', 'Neat.', 'Done.', 'Tidy.',
      'Shut. Nothing leaks.', 'Closed. Reality is grateful.', 'One less door.'],
    often: 0.8,
  },
  locked: {
    first: ['Too strong to seal. Shoot its creatures first.'],
    then: ['Not yet.', 'Still too strong.', 'Too strong. Shoot what comes out.', 'It will not close yet.', 'Thin them out first.'],
  },
  weak: {
    first: ['That rift is weak. Hold SEAL on it.'],
    then: ['Weak enough. Seal it.', 'That one can be sealed.', 'Ready to seal.', 'Seal it while it is weak.', 'It is weak. Your move.'],
  },
  absorbed: {
    first: ['Shots into a rift are lost. Wait until it is clear.'],
    then: ['The rift ate that.', 'Lost in the rift.', 'Wait until it is clear of the rift.', 'Rifts do not mind being shot.'],
    often: 0.5,
  },
  blocked: ['Something is arriving. Wait, then seal.'],

  streak: ['Good shooting.', 'Keep that up.', 'Steady.', 'Nice grouping.', 'Efficient.', 'They are not enjoying this.',
    'Clean.', 'That is the idea.', 'Very tidy.'],
  miss: { first: ['Missed.'], then: ['Missed.', 'Nothing there.', 'Air.', 'Wide.', 'That was a wall.', 'Close. Not close enough.'], often: 0.4 },
  overheat: {
    first: ['Overheated. Let it cool.'],
    then: ['Too hot. Wait.', 'Cooling.', 'Easy on the trigger.', 'Overheated. Short bursts.', 'Hot. Give it a second.'],
  },
  damage: {
    first: ['You are hit. Watch the dots at the edge.'],
    then: ['You are hit.', 'One reached you.', 'That one got to you.', 'Hit.', 'Contact.', 'It got through.', 'That will leave a mark.',
      'Ouch. On your behalf.'],
    often: 0.8,
  },
  low: { first: ['Your health is below thirty percent.'], then: ['Health low.', 'You are running low.', 'Health under thirty. Careful.'] },
  fracturing: {
    first: ['Reality is fracturing. Close some rifts.'],
    then: ['Reality is slipping. Seal something.', 'The room is cracking. Close rifts.', 'Too many rifts open. Reality is giving way.'],
  },
  collapsing: {
    first: ['Reality is close to collapse. Seal something.'],
    then: ['Reality nearly gone.', 'Seal something. Anything.', 'The room is barely holding.'],
  },
  fracturingAuto: ['Reality is fracturing. Shoot faster.', 'The room is cracking. Thin them out.'],
  collapsingAuto: ['Reality is close to collapse. Shoot them.', 'The room is barely holding.'],
  recal: ['Recalibrated.', 'Facing forward.', 'Straightened out.', 'Recentred.'],

  glomm: {
    first: ['A Glomm. It clings to the rift, widens it, and spits. Two shots.'],
    then: ['Glomm.', 'Another Glomm on the rift.', 'Glomm. Shoot it off.', 'Glomm. Mind the spit.', 'A Glomm, clinging.'],
    often: 0.35,
  },
  skaith: {
    first: ['Skaith. It only moves when you look away.'],
    then: ['Skaith. Keep it in view.', 'Skaith about.', 'Skaith. Do not turn your back.', 'Skaith. Listen for footsteps.'],
    often: 0.5,
  },
  ootheen: {
    first: ['Ootheen. Shoot it quickly, or it moves.'],
    then: ['Ootheen.', 'Ootheen. Be quick.', 'It is watching.', 'Ootheen. It hates being looked at.', 'An eye. Just the one.'],
    often: 0.35,
  },
  ootheenJump: { first: ['Too slow. It jumped.'], then: ['It moved.', 'Gone. Over there now.', 'It blinked.', 'Shy.', 'Moved again.'], often: 0.5 },
  zik: {
    first: ['Ziks. Small and fast.'],
    then: ['Ziks.', 'More Ziks.', 'Ziks. Quick ones.', 'Something small and fast.', 'Ziks. Busy little things.'],
    often: 0.35,
  },
  fael: {
    first: ['Fael. It is only solid half the time. Shoot it when it is.'],
    then: ['Fael.', 'Fael. Wait for it to be solid.', 'Fael. Now you see it.', 'A Fael. Timing.'],
    often: 0.4,
  },
  brakk: {
    first: ['Brakk. Armoured. Five shots.'],
    then: ['Brakk.', 'A Brakk. Start shooting.', 'Brakk. Big, slow, rude.', 'Brakk. Keep shooting.', 'Brakk. Hard to miss.'],
    often: 0.5,
  },
  thrum: {
    first: ['Thrum. It charges. Shoot it first.'],
    then: ['Thrum.', 'Thrum, winding up.', 'That one charges.', 'Thrum. Before it charges.'],
    often: 0.5,
  },

  drop: {
    first: ['Power-up. Shoot it before it fades.'],
    then: ['Power-up.', 'Power-up. Quick.', 'Something useful. Shoot it.', 'Power-up. It will not wait.', 'Supplies.'],
    often: 0.7,
  },
  got: { first: ['Collected. Use it from the left side.'], then: ['Collected.', 'Got it.', 'Stored.', 'In the pack.', 'Yours.'], often: 0.6 },
  empty: ['None of those left.', 'Empty.', 'You have none.'],
  full: ['You are already at full health.', 'Health is full.', 'You are fine.'],
  rapid: { first: ['Rapid fire. Hold FIRE.'], then: ['Rapid fire.', 'Hold FIRE.', 'Rapid fire. No overheating for a while.', 'Rapid fire. Enjoy.'] },
  health: ['Health restored.', 'Patched up.', 'Better.', 'Health up.'],
  nova: ['Grenade away.', 'Grenade.', 'Stand back.', 'Fire in the hole.'],
  stasis: {
    first: ['Stasis field. They are held.'],
    then: ['Stasis.', 'Everything holds still.', 'Frozen. Take your time.', 'Stasis. They are not going anywhere.'],
  },
  charge: { first: ['Rift charge armed. Shoot a rift.'], then: ['Rift charge armed.', 'Charge ready. Pick a rift.', 'Armed. Point it at a rift.'] },
  chargeUsed: ['Rift collapsed.', 'Gone.', 'That rift is no more.', 'Collapsed. Tidy.'],

  bossRise: {
    first: ['The Ummagog. Shoot its weak points when they glow.'],
    then: ['The Ummagog again.', 'Ummagog. Shoot the glow.', 'It is back, and bigger.', 'The Ummagog. You know the drill.'],
  },
  bossWeak: ['Weak point exposed.', 'Another weak point. Shoot the glow.', 'Glowing. Shoot it.', 'There. The glow.'],
  bossArmour: { first: ['That is armour. Shoot the glowing part.'], then: ['Armour.', 'Shoot the glow, not the armour.', 'That bit is armour.'], often: 0.6 },
  bossPod: ['Weak point destroyed.', 'One down.', 'Got one.', 'That one is gone.'],
  bossStun: { first: ['It is stunned. Seal its rift now.'], then: ['Stunned. Seal it.', 'It is down. Seal the rift.', 'Now. Seal it.'] },
  bossStunAuto: ['It is stunned. Its rift is closing.', 'Stunned. Hold on.'],
  bossRecover: ['It is back up.', 'Up again.', 'It is recovering.', 'Not finished.'],

  gameover: ['You are down.', 'That is the end of this run.', 'Too many got through to you.', 'Down. Have another go.', 'They win this one.'],
  collapsed: ['Reality has collapsed.', 'The room is gone. Too many rifts, open too long.', 'Reality gave out.', 'No room left. Literally.'],
};

// The lines a category has for the time it is being said: its first-time lines, or the rest.
function pool(key, said) {
  const entry = LINES[key];
  if (!entry || Array.isArray(entry)) return entry;
  return !said && entry.first ? entry.first : entry.then || entry.first;
}

class Scanner {
  constructor() {
    this.text = '';
    this.ttl = 0;       // seconds the current line stays on screen
    this.cool = 0;      // seconds until an unforced remark may replace it
    this.voice = true;
    this.voiceObj = null;
    this.reset();
  }

  // A new run: everything gets explained again the first time.
  reset() {
    this.said = {};     // categories said this run
    this.bags = {};     // lines not yet used, per pool
  }

  // Say a line from a category. Unforced remarks are dropped while the scanner is still talking.
  say(key, force = false) {
    if (level.auto && LINES[key + 'Auto']) key += 'Auto';
    const entry = LINES[key], said = !!this.said[key], lines = pool(key, said);
    if (!lines || (!force && this.cool > 0)) return;
    if (said && !Array.isArray(entry) && Math.random() >= (entry.often ?? 1)) return;
    this.said[key] = true;
    // Deal from a shuffled bag; a refill never starts with the line just said.
    const id = key + (lines === entry.first ? ':first' : '');
    let bag = this.bags[id];
    if (!bag?.length) {
      bag = this.bags[id] = lines.map((_, i) => i).sort(() => Math.random() - 0.5);
      if (bag.length > 1 && lines[bag[bag.length - 1]] === this.text) bag.unshift(bag.pop());
    }
    this.show(lines[bag.pop()], force);
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

  // Browser speech synthesis, pitched down: robotic, which suits. It uses the device's own
  // default voice, so it sounds the same every time; the browser's voice list arrives late on
  // Android, and picking from it gave a different voice depending on whether it had loaded yet.
  speak(text) {
    const synth = window.speechSynthesis;
    if (!this.voice || !synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      this.voiceObj ||= synth.getVoices().find(v => v.default && /^en/i.test(v.lang)) || null;
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
