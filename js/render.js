// The low-resolution canvas and everything drawn to it at the pixel level: the palette-reduced
// camera feed, the debug backdrop, and hard-edged primitives (no anti-aliased paths).

import { H } from './config.js';
import { DEG, dirFromBearing, project } from './projection.js';
import { drawText, initFont } from './font.js';

// view is the scanner's screen: the rectangle inside the casing that the camera and the game
// world are drawn into. safe holds the notch / home-indicator insets, in canvas pixels.
export const R = {
  canvas: null, ctx: null, w: 427, h: H, css: 1,
  view: { x: 46, y: 13, w: 325, h: 214 },
  safe: { t: 0, b: 0, l: 0, r: 0 },
};

// The scanner's view of the room: eight tones, dark navy to pale teal. HURT is the same ramp while taking damage.
const RAMP = ['#05070f', '#0b1524', '#13283a', '#1d4055', '#2c5d6e', '#44808a', '#6aa6a6', '#9ccdc4'];
const HURT = ['#12040a', '#2a0812', '#47101a', '#6b1a22', '#93282b', '#b8443a', '#d86c50', '#f0a07a'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v - 7.5) * 2);

// Packed as ABGR for writing through a Uint32Array view (little-endian, i.e. every phone).
const toLut = ramp => Uint32Array.from(ramp, hex => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
});
const LUT = toLut(RAMP), LUT_HURT = toLut(HURT);

let camCanvas, camCtx, out, out32, src32 = null, lastVideoTime = -1, tick = 0;

export function initRender(canvas) {
  R.canvas = canvas;
  R.ctx = canvas.getContext('2d', { alpha: false });
  camCanvas = document.createElement('canvas');
  camCtx = camCanvas.getContext('2d', { willReadFrequently: true });
  initFont(R.ctx);
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 300));
}

export function resize() {
  // A tab loaded in the background can report a zero-sized window; a later resize event corrects it.
  const vw = window.innerWidth || 640, vh = window.innerHeight || 360;
  // Landscape. A phone screen is filled; a window that is squarer than 16:9 or very wide is letterboxed.
  const aspect = Math.max(16 / 9, Math.min(2.4, vw / vh));
  const cw = Math.min(vw, Math.round(vh * aspect)), ch = Math.round(cw / aspect);
  const w = Math.round(H * aspect);
  const c = R.canvas;
  if (c.width !== w || c.height !== H) { c.width = w; c.height = H; }
  c.style.width = cw + 'px';
  c.style.height = ch + 'px';
  R.w = w;
  R.css = ch / H;
  R.ctx.imageSmoothingEnabled = false;

  const cs = getComputedStyle(document.getElementById('safe'));
  const inset = side => Math.round((parseFloat(cs['padding' + side]) || 0) / R.css);
  const safe = R.safe = { t: inset('Top'), b: inset('Bottom'), l: inset('Left'), r: inset('Right') };
  // The casing: thin strips above and below the screen for the gauges, a grip either side for
  // the controls. It grows into the notch and home-indicator areas rather than leaving them bare.
  const top = 13 + safe.t, bottom = 13 + safe.b;
  const left = Math.max(46, safe.l + 30), right = Math.max(56, safe.r + 40);
  const v = R.view = { x: left, y: top, w: w - left - right, h: H - top - bottom };

  camCanvas.width = v.w;
  camCanvas.height = v.h;
  out = R.ctx.createImageData(v.w, v.h);
  out32 = new Uint32Array(out.data.buffer);
  src32 = null;
  lastVideoTime = -1;
}

// Luminance -> ordered dither -> eight-tone ramp. With glitch > 0, rows tear sideways and the ramp turns red.
function quantize(glitch) {
  const { w, h } = R.view, lut = glitch > 0 ? LUT_HURT : LUT;
  for (let y = 0, i = 0; y < h; y++) {
    let off = 0;
    if (glitch > 0) {
      const band = ((y >> 3) * 73 + tick * 31) % 17;
      if (band < 5) off = Math.round((band - 2) * 14 * glitch);
    }
    const by = (y & 3) << 2, row = y * w;
    for (let x = 0; x < w; x++, i++) {
      let sx = x + off;
      if (sx < 0) sx += w; else if (sx >= w) sx -= w;
      const p = src32[row + sx];
      const lum = ((p & 255) * 77 + ((p >> 8) & 255) * 150 + ((p >> 16) & 255) * 29) >> 8;
      const v = (lum + BAYER[by | (x & 3)]) >> 5;
      out32[i] = lut[v < 0 ? 0 : v > 7 ? 7 : v];
    }
  }
}

export function cameraFrame(video, glitch = 0) {
  const { ctx, view: { x, y, w, h } } = R;
  tick++;
  if (video.readyState >= 2 && video.videoWidth) {
    const fresh = video.currentTime !== lastVideoTime;
    if (fresh) {
      lastVideoTime = video.currentTime;
      // Cover-fit: scale to fill, crop the overflow equally from both sides.
      const vw = video.videoWidth, vh = video.videoHeight;
      const s = Math.max(w / vw, h / vh), sw = w / s, sh = h / s;
      camCtx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
      src32 = new Uint32Array(camCtx.getImageData(0, 0, w, h).data.buffer);
    }
    if (src32 && (fresh || glitch > 0 || tick < 3)) quantize(glitch);
  }
  if (src32) ctx.putImageData(out, x, y);
  else { ctx.fillStyle = RAMP[0]; ctx.fillRect(x, y, w, h); }
}

// Stand-in for the camera: a lattice of dots on the sphere so that looking around reads as motion.
const bd = [0, 0, 0], bp = {};
export function debugBackdrop(glitch = 0) {
  const { ctx, view: { x, y, w, h } } = R;
  tick++;
  ctx.fillStyle = glitch > 0 ? HURT[1] : '#070a14';
  ctx.fillRect(x, y, w, h);
  for (let yaw = -180; yaw < 180; yaw += 15) {
    for (let pitch = -75; pitch <= 75; pitch += 15) {
      project(dirFromBearing(yaw * DEG, pitch * DEG, bd), bp);
      if (!bp.front || bp.x < x || bp.x >= x + w || bp.y < y || bp.y >= y + h) continue;
      const s = pitch === 0 ? 2 : 1;
      ctx.fillStyle = pitch === 0 ? RAMP[4] : pitch < 0 ? RAMP[2] : RAMP[3];
      ctx.fillRect(bp.x | 0, bp.y | 0, s, s);
      if (pitch === 0 && yaw % 45 === 0) drawText((yaw + 360) % 360, bp.x, bp.y + 5, RAMP[3], 1, 0.5);
    }
  }
  if (glitch > 0) {
    ctx.fillStyle = HURT[4];
    for (let i = 0; i < 6; i++) ctx.fillRect(x, y + (tick * 37 + i * 97) % h, w, 2);
  }
}

export function px(x, y, w, h, color) {
  R.ctx.fillStyle = color;
  R.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function box(x, y, w, h, fill, stroke) {
  px(x, y, w, h, stroke);
  px(x + 1, y + 1, w - 2, h - 2, fill);
}

export function line(x0, y0, x1, y1, color, th = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const ctx = R.ctx, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = th >> 1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (let n = 0; n < 2000; n++) {
    ctx.fillRect(x0 - o, y0 - o, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Scanline-filled triangle.
export function tri(ax, ay, bx, by, cx, cy, color) {
  const p = [[ax, ay], [bx, by], [cx, cy]].sort((a, b) => a[1] - b[1]);
  const [[x0, y0], [x1, y1], [x2, y2]] = p;
  const ctx = R.ctx;
  ctx.fillStyle = color;
  for (let y = Math.ceil(y0); y <= Math.floor(y2); y++) {
    const long = x0 + (x2 - x0) * ((y - y0) / (y2 - y0 || 1));
    const short = y < y1
      ? x0 + (x1 - x0) * ((y - y0) / (y1 - y0 || 1))
      : x1 + (x2 - x1) * ((y - y1) / (y2 - y1 || 1));
    const l = Math.round(Math.min(long, short)), r = Math.round(Math.max(long, short));
    ctx.fillRect(l, y, r - l + 1, 1);
  }
}

// Arc of single pixels from angle a0 to a1 (radians, clockwise from +x).
export function ring(cx, cy, r, a0, a1, color, th = 1) {
  const ctx = R.ctx, step = 0.7 / r;
  ctx.fillStyle = color;
  for (let a = a0; a <= a1; a += step) {
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), th, th);
  }
}

// The "ready to seal" mark: four arcs turning around a point, flashing white and cyan. The
// same mark is used around a rift on screen and around the arrow to one that is off screen.
export function reticle(cx, cy, r, t) {
  const color = ((t * 8) | 0) & 1 ? '#ffffff' : '#39e6d0';
  for (let i = 0; i < 4; i++) {
    const a = t * 2.5 + (i * Math.PI) / 2;
    ring(cx, cy, r + 1, a, a + 0.95, '#05070f', 3);
    ring(cx, cy, r, a, a + 0.95, color, 2);
  }
}

// Filled circle, as scanlines.
export function disc(cx, cy, r, color) {
  const ctx = R.ctx;
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

// Sprite centred on (cx, cy), scaled with nearest-neighbour sampling.
export function blit(img, cx, cy, sx, sy = sx) {
  const w = Math.max(1, Math.round(img.width * sx)), h = Math.max(1, Math.round(img.height * sy));
  R.ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}
