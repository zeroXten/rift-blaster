// Everything outside play: title, permissions help, briefing, report, upgrade, game over,
// victory and pause. Each is laid out on the scanner's screen (R.view) with the pixel font,
// inside the same casing as the game, and returns the buttons it drew so main.js can hit-test taps.

import { DIFFICULTY, UI, level } from './config.js';
import { R, blit, box, cameraFrame, debugBackdrop, px } from './render.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { drawFrame } from './frame.js';
import { camera } from './video.js';
import { INCIDENTS } from './incidents.js';
import { CATALOGUE } from './creatures/index.js';
import { DIMS, getSprite } from './sprites.js';
import { drawRiftShape, makeShape } from './rift.js';
import { LINES } from './scanner.js';

const shape = makeShape();
const GRADE_COLOUR = { S: UI.yel, A: UI.c, B: UI.c, C: UI.mid, D: UI.red };
const UPGRADES = [
  { id: 'cool', name: 'COOLANT', desc: 'HEAT DRAINS 35% FASTER' },
  { id: 'beam', name: 'WIDE LENS', desc: 'BEAM FORGIVES 1.5 DEGREES MORE' },
  { id: 'seal', name: 'FAST SEALANT', desc: 'RIFTS SEAL 0.35 SECONDS SOONER' },
];

let buttons = [];

// Button centred on cx.
function button(id, label, cx, y, o = {}) {
  const w = o.w || 150, h = o.h || 22, x = Math.round(cx - w / 2);
  // primary blinks; on marks the selected one of a set.
  const lit = o.on || (o.primary && ((performance.now() / 450) | 0) & 1);
  box(x, y, w, h, lit ? UI.dim : UI.k, o.primary || o.on ? UI.c : UI.mid);
  if (o.sub) {
    drawText(label, cx, y + 5, UI.w, 1, 0.5);
    drawText(o.sub, cx, y + 16, UI.mid, 1, 0.5);
  } else {
    drawText(label, cx, y + ((h - 7) >> 1), o.primary || o.on ? UI.w : o.dim ? UI.mid : UI.c, 1, 0.5);
  }
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
  // Logo and Start on the left, a live rift on the right.
  title(c) {
    const v = R.view, t = c.t, lw = Math.round(v.w * 0.62), lx = v.x + lw / 2, rx = v.x + lw + (v.w - lw) / 2;
    const dim = Object.keys(DIMS)[((t / 5) | 0) % 5];
    backdrop(c, 0.2, 0, () => drawRiftShape(rx, v.y + v.h / 2, v.h / 4.4, 0.82 + Math.sin(t * 0.8) * 0.14, t, DIMS[dim].ramp, shape));
    heading('RIFT', lx, v.y + 8, UI.w, 4);
    heading('BLASTER', lx, v.y + 40, UI.c, 3);
    drawTextS('INTERDIMENSIONAL PEST CONTROL', lx, v.y + 68, UI.yel, 1, 0.5);
    para(`"${LINES.permission[0]}"`, lx, v.y + 84, lw - 10, UI.w);
    Object.keys(DIFFICULTY).forEach((key, i) => {
      button(key, DIFFICULTY[key].name, lx + (i - 1) * 60, v.y + 106, { w: 56, h: 17, on: key === level.key, dim: true });
    });
    button('start', c.starting ? 'STAND BY...' : 'START', lx, v.y + 128, { primary: true, h: 24, w: 120 });
    para(c.debug
      ? 'DESKTOP: DRAG OR ARROWS TO LOOK. CLICK OR SPACE FIRES. F: FULL SCREEN. 1-5: INCIDENT.'
      : 'IPHONE: SOUND IS OFF WHILE THE RINGER SWITCH IS SET TO SILENT.', lx, v.y + 158, lw - 10, UI.mid);
    const best = c.store.scores[0];
    if (best) drawText(`BEST RUN ${best.score}`, lx, v.y + v.h - 12, UI.yel, 1, 0.5);
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

  // The scanner's briefing on the left, the catalogue card for the new creature on the right.
  briefing(c) {
    const v = R.view, inc = INCIDENTS[c.run.incident], cat = CATALOGUE[inc.creature];
    const cw = 118, lw = v.w - cw - 14, x = v.x + 8;
    backdrop(c, 0.78);
    drawText(`INCIDENT ${c.run.incident + 1} OF ${INCIDENTS.length} - ${level.name}`, x, v.y + 8, UI.mid);
    heading(inc.name, x, v.y + 19, UI.w, 2, 0);
    // It types its briefing out; a tap completes it.
    let n = Math.floor(c.t * 45), y = v.y + 42;
    for (const l of wrapText(inc.briefing.join('\n\n'), (lw / 6) | 0)) {
      if (n <= 0) break;
      drawText(l.slice(0, n), x, y, UI.c);
      n -= l.length;
      y += 9;
    }

    const cx0 = v.x + v.w - cw - 6, cx = cx0 + cw / 2, cy = v.y + 8;
    const ramp = DIMS[cat.dim].ramp, spr = getSprite(cat.sprite, cat.dim);
    box(cx0, cy, cw, 148, UI.k, ramp[1]);
    blit(spr.frames[((c.t * 3) | 0) % spr.frames.length], cx, cy + 34, Math.max(1, Math.floor(56 / Math.max(spr.w, spr.h))));
    drawText('NEW ENTRY', cx, cy + 68, UI.yel, 1, 0.5);
    drawText(cat.name, cx, cy + 80, UI.w, 1, 0.5);
    drawText(`FROM ${DIMS[cat.dim].name}`, cx, cy + 92, ramp[2], 1, 0.5);
    drawText(`HP ${cat.hp}`, cx, cy + 103, ramp[2], 1, 0.5);
    para(cat.note, cx, cy + 116, cw - 8, UI.mid);
    button('begin', 'BEGIN', cx, v.y + v.h - 34, { primary: true, w: cw, h: 24 });
  },

  // Figures on the left, the scanner's verdict on the right.
  report(c) {
    const v = R.view, mx = v.x + v.w / 2, r = c.report;
    const lw = Math.round(v.w * 0.56), rx = v.x + lw + (v.w - lw) / 2;
    backdrop(c, 0.8);
    heading('INCIDENT CONTAINED', mx, v.y + 8, UI.c, 2);
    drawText(INCIDENTS[c.run.incident].name, mx, v.y + 28, UI.mid, 1, 0.5);
    let y = v.y + 50;
    const row = (k, val) => { drawText(k, v.x + 12, y, UI.mid); drawText(val, v.x + lw - 8, y, UI.w, 1, 1); y += 12; };
    row('CREATURES SHOT', r.kills);
    row('RIFTS SEALED', `${r.sealed}/${r.total}`);
    row('INTEGRITY LEFT', r.integrity + '%');
    row('ACCURACY', r.acc + '%');
    row('SCORE', r.score);
    row('RUN TOTAL', c.run.score);
    drawText("SCANNER'S GRADE", rx, v.y + 46, UI.mid, 1, 0.5);
    heading(r.grade, rx, v.y + 58, GRADE_COLOUR[r.grade], 6);
    para(`"${r.comment}"`, rx, v.y + 108, v.w - lw - 10, UI.c);
    button('continue', 'CONTINUE', mx, v.y + v.h - 30, { primary: true });
  },

  upgrade(c) {
    const v = R.view, mx = v.x + v.w / 2;
    backdrop(c, 0.8);
    heading('FIELD UPGRADE', mx, v.y + 8, UI.c, 2);
    let y = para(`"${LINES.upgrade[0]}"`, mx, v.y + 30, v.w - 20, UI.w) + 10;
    for (const u of UPGRADES) {
      const lvl = c.run.upgrades[u.id];
      button('up_' + u.id, u.name + (lvl ? ' ' + '+'.repeat(lvl) : ''), mx, y, { h: 30, w: 210, sub: u.desc });
      y += 36;
    }
  },

  gameover(c) {
    const v = R.view, mx = v.x + v.w / 2;
    backdrop(c, 0.5, 0.7);
    heading('REALITY COMPROMISED', mx, v.y + 26, UI.red, 2);
    para(`"${c.report.comment}"`, mx, v.y + 58, v.w - 30, UI.c);
    drawText(`RUN TOTAL ${c.run.score}`, mx, v.y + 96, UI.yel, 1, 0.5);
    button('retry', 'TRY AGAIN', mx - 72, v.y + v.h - 40, { primary: true, w: 134 });
    button('title', 'GIVE UP', mx + 72, v.y + v.h - 40, { w: 134 });
  },

  victory(c) {
    const v = R.view, mx = v.x + v.w / 2, lw = Math.round(v.w * 0.58), lx = v.x + lw / 2, rx = v.x + lw + (v.w - lw) / 2;
    backdrop(c, 0.8);
    heading('ALL RIFTS SEALED', mx, v.y + 10, UI.c, 2);
    const y = para(`"${LINES.victory[0]}"`, lx, v.y + 42, lw - 16, UI.w) + 12;
    drawText(`FINAL SCORE ${c.run.score}`, lx, y, UI.yel, 1, 0.5);
    drawText(`GRADES ${c.run.grades.join(' ')}`, lx, y + 12, UI.mid, 1, 0.5);
    drawText('BEST RUNS', rx, v.y + 42, UI.c, 1, 0.5);
    c.store.scores.forEach((s, i) => {
      const mine = s.id === c.run.id, ry = v.y + 56 + i * 11;
      drawText(`${i + 1}.`, rx - 36, ry, mine ? UI.yel : UI.mid);
      drawText(s.score, rx + 36, ry, mine ? UI.yel : UI.w, 1, 1);
    });
    button('title', 'DONE', mx, v.y + v.h - 30, { primary: true });
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
    item('title', 'ABANDON INCIDENT');
  },
};

export function drawScreen(state, c) {
  buttons = [];
  SCREENS[state]?.(c);
  return buttons;
}
