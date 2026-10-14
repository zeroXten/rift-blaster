// Everything outside play: title, the how-to-play guide, permissions help, game over and
// pause, plus the flash that marks each new level. Each is laid out on the scanner's screen
// (R.view) with the pixel font, inside the same casing as the game, and returns the buttons it
// drew so main.js can hit-test taps.

import { DIFFICULTY, UI, VERSION, level } from './config.js';
import { R, blit, box, cameraFrame, debugBackdrop, px, reticle } from './render.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { drawFrame } from './frame.js';
import { camera } from './video.js';
import { DIMS, getSprite } from './sprites.js';
import { POWERUPS, powerIcon } from './pickups.js';
import { drawRift, makeShape } from './rift.js';
import { arrowAt, dotAt, plusAt } from './indicators.js';
import { LINES } from './scanner.js';

const shape = makeShape();

// The how-to-play guide. Its first page is these paragraphs; then the creatures, then the power-ups.
const GUIDE_PAGES = ['HOW TO PLAY', 'SIGNS', 'CREATURES', 'POWER-UPS'];
export const GUIDE_LENGTH = GUIDE_PAGES.length;
const HOW_TO = [
  'Rifts open around the room. Arrows at the edge of the screen point to them: see SIGNS.',
  'Creatures come out of them. Dots at the edge of the screen show any you cannot see. Shoot each one with FIRE once it is clear of its rift.',
  'Every creature you shoot weakens its rift: the bar under it drains. When it is empty, aim at the rift and hold SEAL: nothing can come through while you do.',
  'HEALTH is you: creatures that reach you take it. REALITY is the room: leaving a rift open once it can be sealed wears it down. Lose either and the run is over.',
  'Seal every rift to clear a level. Each level is harder than the last.',
];
// The third paragraph on the setting where rifts close themselves.
const HOW_TO_AUTO = 'Every creature you shoot weakens its rift: the bar under it drains. When it is empty the rift closes itself.';
const BESTIARY = [
  { name: 'Yrrk', sprite: 'yrrk', dim: 'vesh', note: 'Corkscrewing packs.' },
  { name: 'Zik', sprite: 'zik', dim: 'vesh', note: 'Tiny, fast, erratic.' },
  { name: 'Glomm', sprite: 'glomm', dim: 'ulta', note: 'Widens its rift. Spits.' },
  { name: 'Brakk', sprite: 'brakk', dim: 'ulta', note: 'Armoured. Five shots.' },
  { name: 'Skaith', sprite: 'skaith', dim: 'hollow', note: 'Moves when unseen.' },
  { name: 'Fael', sprite: 'fael', dim: 'hollow', note: 'Solid half the time.' },
  { name: 'Ootheen', sprite: 'ootheen', dim: 'miridian', note: 'Jumps if aimed at.' },
  { name: 'Thrum', sprite: 'thrum', dim: 'miridian', note: 'Warns, then charges.' },
  { name: 'The Ummagog', sprite: 'core', dim: 'unknown', note: 'Boss. Shoot the glow.' },
];
let buttons = [];

// Button centred on cx. primary blinks; on marks the selected one of a set.
function button(id, label, cx, y, o = {}) {
  const w = o.w || 150, h = o.h || 22, x = Math.round(cx - w / 2);
  const lit = o.on || (o.primary && ((performance.now() / 450) | 0) & 1);
  box(x, y, w, h, lit ? UI.dim : UI.k, o.primary || o.on ? UI.c : UI.mid);
  drawText(label, cx, y + ((h - 7) >> 1), o.primary || o.on ? UI.w : o.dim ? UI.mid : UI.c, 1, 0.5);
  buttons.push({ id, x, y, w, h, primary: !!o.primary });
}

// The room (or the debug lattice) dimmed so text reads over it, then the casing around it.
// under() draws anything that belongs behind the casing.
function backdrop(c, dim, glitch = 0, under = null) {
  const v = R.view;
  if (camera.ready) cameraFrame(camera.video, glitch);
  else debugBackdrop(glitch);
  under?.();
  R.ctx.globalAlpha = dim;
  px(v.x, v.y, v.w, v.h, UI.k);
  R.ctx.globalAlpha = 1;
  drawFrame({ led: ((c.t * 1.5) | 0) & 1 ? UI.c : UI.dim });
}

// Wrapped paragraph in a column `width` pixels wide; returns the y below it.
// align 0 starts at x, 0.5 centres on x.
function para(text, x, y, width, color = UI.c, align = 0.5) {
  const lines = wrapText(text, Math.max(12, (width / 6) | 0));
  lines.forEach((l, i) => drawText(l, x, y + i * 9, color, 1, align));
  return y + lines.length * 9;
}

function heading(text, x, y, color, scale, align = 0.5) {
  drawText(text, x + scale, y + scale, '#3d060c', scale, align);
  drawText(text, x, y, color, scale, align);
}

const SCREENS = {
  // Logo and Start on the left, a live rift on the right, cycling through the dimensions.
  title(c) {
    const v = R.view, t = c.t, lw = Math.round(v.w * 0.62), lx = v.x + lw / 2, rx = v.x + lw + (v.w - lw) / 2;
    const dim = DIMS[Object.keys(DIMS)[((t / 5) | 0) % 5]];
    backdrop(c, 0.2, 0, () => drawRift(dim.rift, rx, v.y + v.h / 2, v.h / 4.4, 0.82 + Math.sin(t * 0.8) * 0.14, t, dim.ramp, shape));
    heading('RIFT', lx, v.y + 8, UI.w, 4);
    heading('BLASTER', lx, v.y + 40, UI.c, 3);
    drawTextS('INTERDIMENSIONAL PEST CONTROL', lx, v.y + 68, UI.yel, 1, 0.5);
    para(`"${LINES.permission[0]}"`, lx, v.y + 84, lw - 10, UI.w);
    const keys = Object.keys(DIFFICULTY);
    keys.forEach((key, i) => {
      button(key, DIFFICULTY[key].name, lx + (i - (keys.length - 1) / 2) * 49, v.y + 106, { w: 46, h: 17, on: key === level.key, dim: true });
    });
    button('start', c.starting ? 'STAND BY' : 'START', lx - 44, v.y + 128, { primary: true, h: 24, w: 98 });
    button('guide', 'HOW TO PLAY', lx + 53, v.y + 128, { h: 24, w: 84 });
    para(c.debug
      ? 'DESKTOP: DRAG TO LOOK. CLICK OR SPACE FIRES. E OR RIGHT BUTTON SEALS. 1-5 USE POWER-UPS. F: FULL SCREEN.'
      : 'IPHONE: SOUND IS OFF WHILE THE RINGER SWITCH IS SET TO SILENT.', lx, v.y + 158, lw - 10, UI.mid);
    const best = c.store.scores[0];
    if (best) drawText(`BEST ${best.score}  LEVEL ${best.level || 1}`, lx, v.y + v.h - 12, UI.yel, 1, 0.5);
    // The version number is also a hidden switch: see main.js.
    drawText('V' + VERSION, v.x + v.w - 5, v.y + v.h - 11, [UI.mid, '#ff9a2a', UI.red][c.cheat || 0], 1, 1);
    buttons.push({ id: 'version', x: v.x + v.w - 62, y: v.y + v.h - 24, w: 62, h: 24, quiet: true });
  },

  // How the game works, what the creatures are, and what the power-ups do: three pages.
  guide(c) {
    const v = R.view, mx = v.x + v.w / 2, page = c.page;
    backdrop(c, 0.82);
    heading(GUIDE_PAGES[page], mx, v.y + 8, UI.c, 2);
    let y = v.y + 30;
    if (page === 0) {
      HOW_TO.forEach((text, i) => { y = para(level.auto && i === 2 ? HOW_TO_AUTO : text, v.x + 10, y, v.w - 20, UI.w, 0) + 4; });
    } else if (page === 1) {
      // Everything that appears around the edge of the screen, drawn as it is in play.
      const green = DIMS.vesh.ramp[2], t = c.t, ix = v.x + 22;
      const row = (name, text, draw) => {
        draw(y + 8);
        drawText(name, v.x + 44, y, UI.w);
        drawText(text, v.x + 44, y + 9, UI.mid);
        y += 20;
      };
      row('ARROW', 'A rift that way, in its colour. Bigger: wider.', cy => arrowAt(ix + 5, cy, 1, 0, green, 8));
      row('TWO ARROWHEADS', 'That rift is behind you.', cy => arrowAt(ix + 8, cy, 1, 0, green, 8, true));
      row('TURNING RING', 'That rift is weak enough. Go and hold SEAL.', cy => { arrowAt(ix + 5, cy, 1, 0, green, 6); reticle(ix + 1, cy, 9, t); });
      row('DOT', 'A creature you cannot see.', cy => dotAt(ix, cy, green, false, t));
      row('BIG RED DOT', 'A creature about to reach you.', cy => dotAt(ix, cy, green, true, t));
      row('PLUS', 'A power-up waiting to be collected.', cy => plusAt(ix, cy, POWERUPS.rapid.color));
      row('BAR UNDER A RIFT', 'Its strength. Shoot its creatures to drain it.', cy => { px(ix - 12, cy - 2, 25, 5, UI.k); px(ix - 11, cy - 1, 23, 3, DIMS.vesh.ramp[0]); px(ix - 11, cy - 1, 13, 3, DIMS.vesh.ramp[3]); });
    } else if (page === 2) {
      // Two columns. A creature is the colour of the rift it comes from.
      const half = Math.ceil(BESTIARY.length / 2), cw = v.w / 2;
      BESTIARY.forEach((b, i) => {
        const x = v.x + 6 + (i < half ? 0 : cw), ey = y + (i % half) * 21, spr = getSprite(b.sprite, b.dim);
        blit(spr.frames[0], x + 10, ey + 8, Math.min(1, 19 / Math.max(spr.w, spr.h)));
        drawText(b.name, x + 24, ey, DIMS[b.dim].ramp[2]);
        drawText(b.note, x + 24, ey + 9, UI.mid);
      });
      para('A creature is the colour of the rift it comes from.', mx, y + half * 21 + 2, v.w - 20, UI.w);
    } else {
      y = para('Creatures sometimes drop these. Shoot one within a few seconds to collect it, then use it from the buttons on the left. Better ones appear on later levels.', v.x + 10, y, v.w - 20, UI.w, 0) + 6;
      for (const kind of Object.keys(POWERUPS)) {
        const def = POWERUPS[kind];
        blit(powerIcon(kind), v.x + 17.5, y + 8.5, 2);
        drawText(def.name, v.x + 32, y, def.color);
        drawText(`LEVEL ${def.from}+`, v.x + v.w - 10, y, UI.mid, 1, 1);
        drawText(def.info, v.x + 32, y + 9, UI.mid);
        y += 21;
      }
    }
    const by = v.y + v.h - 26;
    button('title', 'BACK', mx - 82, by, { w: 90 });
    drawText(`${page + 1}/${GUIDE_PAGES.length}`, mx, by + 7, UI.mid, 1, 0.5);
    button('guide_next', page < GUIDE_PAGES.length - 1 ? 'NEXT' : 'FIRST PAGE', mx + 82, by, { primary: true, w: 90 });
  },

  // Shown when the camera or motion sensors were refused: how to recover, and ways to play anyway.
  help(c) {
    const v = R.view, mx = v.x + v.w / 2, hp = c.help;
    backdrop(c, 0.78);
    heading(hp.camera && hp.motion ? "I CAN'T SEE OR FEEL" : hp.camera ? "I CAN'T SEE" : "I CAN'T FEEL MOTION", mx, v.y + 8, UI.red, 2);
    const lines = [];
    if (hp.camera === 'insecure') lines.push('This page is not secure. The camera and motion sensors only work over HTTPS. Open the https address.');
    else if (hp.camera) lines.push(hp.ios
      ? 'CAMERA: tap the page menu in the address bar, then Website Settings, and set Camera to Allow. Or: Settings > Apps > Safari > Camera.'
      : 'CAMERA: tap the icon to the left of the address, then Permissions, and allow Camera.');
    if (hp.motion === 'denied') lines.push(hp.ios
      ? 'MOTION: Safari remembers a refusal until the tab is closed. Close this tab, open the page again, tap START and choose Allow.'
      : 'MOTION: allow Motion Sensors in the site settings, then reload.');
    else if (hp.motion) lines.push('MOTION: no orientation sensor answered. This device may not have one.');
    let y = v.y + 34;
    for (const l of lines) y = para(l, v.x + 10, y, v.w - 20, UI.c, 0) + 7;

    const by = v.y + v.h - 30;
    button('reload', 'TRY AGAIN', mx - 84, by, { primary: true, w: 120 });
    if (hp.motion) button('drag', 'PLAY WITH DRAG-TO-LOOK', mx + 64, by, { w: 160 });
    else button('nocam', 'PLAY WITHOUT CAMERA', mx + 64, by, { w: 160 });
  },

  // How far the run got.
  gameover(c) {
    const v = R.view, mx = v.x + v.w / 2, o = c.over;
    backdrop(c, 0.55, 0.7);
    heading(o.cause === 'reality' ? 'REALITY COLLAPSED' : 'YOU ARE DOWN', mx, v.y + 14, UI.red, 2);
    drawText(`"${o.comment}"`, mx, v.y + 40, UI.c, 1, 0.5);
    let y = v.y + 62;
    const row = (k, val, col = UI.w) => { drawText(k, mx - 90, y, UI.mid); drawText(val, mx + 90, y, col, 1, 1); y += 12; };
    row('LEVEL REACHED', o.level);
    row('CREATURES SHOT', o.kills);
    row('SCORE', o.score, UI.yel);
    const best = c.store.scores[0];
    if (best) row('BEST', best.score);
    button('retry', `RETRY LEVEL ${o.level}`, mx - 72, v.y + v.h - 40, { primary: true, w: 134 });
    button('title', 'GIVE UP', mx + 72, v.y + v.h - 40, { w: 134 });
  },

  // Drawn over the frozen game frame, which has already drawn the casing.
  paused(c) {
    const v = R.view, mx = v.x + v.w / 2;
    R.ctx.globalAlpha = 0.72;
    px(v.x, v.y, v.w, v.h, UI.k);
    R.ctx.globalAlpha = 1;
    heading('PAUSED', mx, v.y + 10, UI.c, 2);
    let y = v.y + 38;
    const item = (id, label, o) => { button(id, label, mx, y, { h: 22, w: 170, ...o }); y += 27; };
    item('resume', 'RESUME', { primary: true });
    item('recal', 'RECALIBRATE');
    item('music', `MUSIC: ${c.store.music ? 'ON' : 'OFF'}`);
    item('voice', `VOICE: ${c.store.voice ? 'ON' : 'OFF'}`);
    item('title', 'END THIS RUN');
  },
};

export function drawScreen(state, c) {
  buttons = [];
  SCREENS[state]?.(c);
  return buttons;
}

// The new level's number, flashed at the top of the screen for a moment as the level starts.
// left runs from 1 down to 0 over the time it is shown.
export function drawLevelFlash(n, left) {
  const v = R.view, mx = v.x + v.w / 2, y = v.y + 12;
  // A bar that shrinks away under the number; both blink out at the end.
  if (left < 0.25 && ((left * 40) | 0) & 1) return;
  const lit = ((left * 14) | 0) & 1;
  heading(`LEVEL ${n}`, mx, y, lit ? UI.w : UI.yel, 2);
  const w = Math.round(110 * left);
  px(mx - w / 2, y + 18, w, 1, lit ? UI.w : UI.yel);
}
