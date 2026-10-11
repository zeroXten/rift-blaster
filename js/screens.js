// Everything outside play: title, permissions help, game over and pause, plus the flash that
// marks each new level. Each is laid out on the scanner's screen
// (R.view) with the pixel font, inside the same casing as the game, and returns the buttons it
// drew so main.js can hit-test taps.

import { DIFFICULTY, UI, level } from './config.js';
import { R, box, cameraFrame, debugBackdrop, px } from './render.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { drawFrame } from './frame.js';
import { camera } from './video.js';
import { DIMS } from './sprites.js';
import { drawRift, makeShape } from './rift.js';
import { LINES } from './scanner.js';

const shape = makeShape();
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
    Object.keys(DIFFICULTY).forEach((key, i) => {
      button(key, DIFFICULTY[key].name, lx + (i - 1) * 60, v.y + 106, { w: 56, h: 17, on: key === level.key, dim: true });
    });
    button('start', c.starting ? 'STAND BY...' : 'START', lx, v.y + 128, { primary: true, h: 24, w: 120 });
    para(c.debug
      ? 'DESKTOP: DRAG TO LOOK. CLICK OR SPACE FIRES. E OR RIGHT BUTTON SEALS. 1-5 USE POWER-UPS. F: FULL SCREEN.'
      : 'IPHONE: SOUND IS OFF WHILE THE RINGER SWITCH IS SET TO SILENT.', lx, v.y + 158, lw - 10, UI.mid);
    const best = c.store.scores[0];
    if (best) drawText(`BEST ${best.score}  LEVEL ${best.level || 1}`, lx, v.y + v.h - 12, UI.yel, 1, 0.5);
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
