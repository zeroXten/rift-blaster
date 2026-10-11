// In-game HUD. Reality Integrity and Scanner Heat are gauges in the casing (frame.js draws the
// casing itself); on the screen there is only the crosshair, the seal ring and the scanner's remarks.

import { UI } from './config.js';
import { view } from './projection.js';
import { R, px, ring } from './render.js';
import { drawText, drawTextS, wrapText } from './font.js';
import { drawFrame, gauges } from './frame.js';
import { scanner } from './scanner.js';

export function drawHud(game) {
  const { ctx, view: v } = R, wp = game.weapon, t = game.t;
  const cx = Math.round(view.cx), cy = Math.round(view.cy);
  const blink = ((t * 6) | 0) & 1, hot = wp.lock > 0;

  const iv = game.integrity, ic = iv > 60 ? UI.c : iv > 30 ? UI.yel : UI.red;
  drawFrame({ live: true, pressed: wp.kick > 0, hot, led: iv > 60 ? '#8be025' : iv > 30 ? UI.yel : blink ? UI.red : '#47101a' });

  // Reality Integrity, top strip
  const { reality: rg, heat: hg } = gauges();
  drawText('REALITY', rg.x, rg.y, ic);
  if (iv > 30 || blink) px(rg.bar + 2, rg.y + 1, Math.round(((rg.barW - 4) * iv) / 100), 5, ic);
  drawText(Math.ceil(iv) + '%', rg.bar + rg.barW + 4, rg.y, ic);
  drawText(`RIFTS ${game.stats.sealed}/${game.total}`, rg.right, rg.y, UI.w, 1, 1);

  // Scanner Heat, bottom strip
  const hc = hot ? UI.red : wp.heat > 70 ? UI.yel : UI.c;
  drawText('HEAT', hg.x, hg.y, hc);
  px(hg.bar + 2, hg.y + 1, Math.round(((hg.barW - 4) * Math.min(100, wp.heat)) / 100), 5, hc);
  if (hot && blink) drawTextS('OVERHEAT', hg.bar + hg.barW / 2, hg.y, UI.w, 1, 0.5);

  // Crosshair: red when overheated, yellow when on a target.
  const cc = hot ? UI.red : wp.target ? UI.yel : UI.c;
  const gap = 5 + (wp.kick > 0 ? 3 : 0) - (wp.target && !hot ? 1 : 0);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x0 = cx + dx * gap, y0 = cy + dy * gap;
    px(Math.min(x0, x0 + dx * 4) - (dy ? 1 : 0), Math.min(y0, y0 + dy * 4) - (dx ? 1 : 0), dx ? 5 : 3, dy ? 5 : 3, UI.k);
    px(Math.min(x0, x0 + dx * 3), Math.min(y0, y0 + dy * 3), dx ? 4 : 1, dy ? 4 : 1, cc);
  }
  px(cx, cy, 1, 1, cc);

  // Seal ring: fills over the seal time; red while something is in the way.
  const rift = wp.rift;
  if (rift && !rift.sealed) {
    const blocked = rift.blocked;
    ring(cx, cy, 15, 0, 6.3, UI.k, 2);
    ring(cx, cy, 15, 0, 6.3, blocked ? (blink ? UI.red : UI.dim) : UI.dim);
    if (wp.seal > 0) ring(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + wp.seal * Math.PI * 2, blocked ? UI.red : UI.w, 2);
    const label = !blocked ? 'SEALING'
      : rift.kills < rift.lockKills ? `SAMPLES ${rift.kills}/${rift.lockKills}`
      : rift.bossLock ? 'LOCKED'
      : 'BLOCKED';
    drawTextS(label, cx, cy + 22, blocked ? UI.red : UI.w, 1, 0.5);
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
