// In-game HUD. Health, Reality Integrity, Scanner Heat and the controls are in the casing (frame.js
// draws that); on the screen there is the crosshair, the seal ring, what the crosshair is on,
// and the scanner's remarks.

import { UI, level } from './config.js';
import { view } from './projection.js';
import { R, blit, px, ring } from './render.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { drawFrame, gauges } from './frame.js';
import { POWERUPS, powerIcon } from './pickups.js';
import { scanner } from './scanner.js';

export function drawHud(game) {
  const { ctx, view: v } = R, wp = game.weapon, t = game.t;
  const cx = Math.round(view.cx), cy = Math.round(view.cy);
  const blink = ((t * 6) | 0) & 1, hot = wp.lock > 0;

  // Health (the player) and Reality (the room), side by side in the top strip.
  const grade = (value, good) => (value > 60 ? good : value > 30 ? UI.yel : UI.red);
  const worst = Math.min(game.health, game.reality);
  drawFrame({
    live: true, pressed: wp.kick > 0, sealing: game.sealing, hot,
    led: worst > 60 ? '#8be025' : worst > 30 ? UI.yel : blink ? UI.red : '#47101a',
    inv: game.inv, active: { rapid: game.rapid > 0, stasis: game.stasis > 0, charge: game.charge },
  });
  const { health: hp, reality: rg, heat: hg } = gauges();
  for (const [g, name, value, good] of [[hp, 'HEALTH', game.health, '#8be025'], [rg, 'REALITY', game.reality, UI.c]]) {
    const col = grade(value, good);
    drawText(name, g.x, g.y, col);
    if (value > 30 || blink) px(g.bar + 2, g.y + 1, Math.round(((g.barW - 4) * value) / 100), 5, col);
  }

  // Scanner Heat, bottom strip
  const hc = hot ? UI.red : wp.heat > 70 ? UI.yel : UI.c;
  drawText('HEAT', hg.x, hg.y, hc);
  px(hg.bar + 2, hg.y + 1, Math.round(((hg.barW - 4) * Math.min(100, wp.heat)) / 100), 5, hc);
  if (hot && blink) drawTextS('OVERHEAT', hg.bar + hg.barW / 2, hg.y, UI.w, 1, 0.5);

  // The level, and the power-ups in force with their time left.
  drawTextS(`LEVEL ${level.n}  RIFTS ${game.stats.sealed}/${game.total}`, v.x + 6, v.y + 6, UI.mid);
  let ey = v.y + 18;
  const chip = (kind, left, label) => {
    const col = POWERUPS[kind].color;
    blit(powerIcon(kind), v.x + 9.5, ey + 3.5, 1);
    if (label) drawTextS(label, v.x + 16, ey, col);
    else {
      px(v.x + 16, ey + 1, 24, 5, UI.k);
      px(v.x + 17, ey + 2, Math.round(22 * left), 3, col);
    }
    ey += 11;
  };
  if (game.rapid > 0) chip('rapid', game.rapid / POWERUPS.rapid.time);
  if (game.stasis > 0) chip('stasis', game.stasis / POWERUPS.stasis.time);
  if (game.charge) chip('charge', 0, 'RIFT CHARGE: SHOOT A RIFT');
  if (game.banner && (game.banner.t > 0.5 || blink)) drawTextS(game.banner.text, cx, v.y + v.h * 0.3, game.banner.color, 2, 0.5);

  // Crosshair: red when overheated, yellow when on a target.
  const cc = hot ? UI.red : wp.target ? UI.yel : UI.c;
  const gap = 5 + (wp.kick > 0 ? 3 : 0) - (wp.target && !hot ? 1 : 0);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x0 = cx + dx * gap, y0 = cy + dy * gap;
    px(Math.min(x0, x0 + dx * 4) - (dy ? 1 : 0), Math.min(y0, y0 + dy * 4) - (dx ? 1 : 0), dx ? 5 : 3, dy ? 5 : 3, UI.k);
    px(Math.min(x0, x0 + dx * 3), Math.min(y0, y0 + dy * 3), dx ? 4 : 1, dy ? 4 : 1, cc);
  }
  px(cx, cy, 1, 1, cc);
  if (wp.swallowed > 0) drawTextS('NO EFFECT', cx, cy - 30, UI.mid, 1, 0.5);

  // On a rift: say what state it is in and what to do about it. The ring fills while SEAL is
  // held on a rift that is ready.
  const rift = wp.rift;
  if (rift && !rift.sealed) {
    const ready = !rift.blocked;
    ring(cx, cy, 15, 0, 6.3, UI.k, 2);
    ring(cx, cy, 15, 0, 6.3, ready ? (blink || game.sealing ? UI.w : UI.dim) : blink ? UI.red : UI.dim);
    if (wp.seal > 0) ring(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + wp.seal * Math.PI * 2, UI.w, 2);
    const label = rift.locked ? (rift.bossLock ? 'LOCKED' : 'TOO STRONG') : !ready ? 'WAIT' : game.sealing ? 'SEALING' : 'HOLD SEAL';
    drawTextS(label, cx, cy + 22, ready ? UI.w : UI.red, 1, 0.5);
  } else if (game.sealing) {
    drawTextS('AIM AT A RIFT', cx, cy + 22, UI.mid, 1, 0.5);
  }

  // Scanner remark: one line at a time, a few words, along the bottom of the screen.
  if (scanner.ttl > 0) {
    const lines = wrapText(scanner.text, Math.min(60, ((v.w - 24) / 6) | 0)), lh = 9;
    const y0 = v.y + v.h - 5 - lines.length * lh;
    ctx.globalAlpha = 0.75;
    px(v.x + 6, y0 - 3, v.w - 12, lines.length * lh + 4, UI.k);
    ctx.globalAlpha = 1;
    lines.forEach((l, i) => drawText(l, cx, y0 + i * lh, UI.c, 1, 0.5));
  }
}
