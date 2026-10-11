// The only 3D maths in the game: quaternions, bearings on a sphere, and a perspective divide.
// World space is Y-up. Yaw 0 looks down -Z; positive yaw turns right, positive pitch looks up.
// Quaternions are [x, y, z, w]; vectors are [x, y, z].

export const DEG = Math.PI / 180;

export function dirFromBearing(yaw, pitch, out = [0, 0, 0]) {
  const cp = Math.cos(pitch);
  out[0] = Math.sin(yaw) * cp;
  out[1] = Math.sin(pitch);
  out[2] = -Math.cos(yaw) * cp;
  return out;
}

export function wrapAngle(a) {
  const t = Math.PI * 2;
  return ((((a + Math.PI) % t) + t) % t) - Math.PI;
}

export function qAxis(x, y, z, angle) {
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

export function qMul(a, b, out = [0, 0, 0, 1]) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by - ax * bz + ay * bw + az * bx;
  out[2] = aw * bz + ax * by - ay * bx + az * bw;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}

export function qRotate(q, v, out = [0, 0, 0]) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  out[0] = vx + w * tx + (y * tz - z * ty);
  out[1] = vy + w * ty + (z * tx - x * tz);
  out[2] = vz + w * tz + (x * ty - y * tx);
  return out;
}

export function qSlerp(a, b, t, out = [0, 0, 0, 1]) {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let ka = 1 - t, kb = t;
  if (cos < 0.9995) {
    const th = Math.acos(cos), s = Math.sin(th);
    ka = Math.sin((1 - t) * th) / s;
    kb = Math.sin(t * th) / s;
  }
  const x = a[0] * ka + bx * kb, y = a[1] * ka + by * kb, z = a[2] * ka + bz * kb, w = a[3] * ka + bw * kb;
  const n = Math.hypot(x, y, z, w) || 1;
  out[0] = x / n; out[1] = y / n; out[2] = z / n; out[3] = w / n;
  return out;
}

// Current camera: basis vectors in world space plus the mapping onto the scanner's screen,
// which is the rectangle (x0, y0, w, h) inside the casing.
export const view = {
  x0: 0, y0: 0, w: 320, h: 214, cx: 160, cy: 107, f: 256,
  right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1],
  yaw: 0, pitch: 0,
};

export function setView(q, rect, fovDeg) {
  qRotate(q, [1, 0, 0], view.right);
  qRotate(q, [0, 1, 0], view.up);
  qRotate(q, [0, 0, -1], view.fwd);
  view.x0 = rect.x; view.y0 = rect.y; view.w = rect.w; view.h = rect.h;
  view.cx = rect.x + rect.w / 2; view.cy = rect.y + rect.h / 2;
  view.f = (rect.w / 2) / Math.tan((fovDeg * DEG) / 2);
  view.yaw = Math.atan2(view.fwd[0], -view.fwd[2]);
  view.pitch = Math.asin(Math.max(-1, Math.min(1, view.fwd[1])));
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Rotating by the inverse camera rotation is three dot products with the camera's basis.
// out.lx / out.ly are the camera-space direction (also valid behind the player, for edge arrows and panning).
export function project(dir, out) {
  const lx = dot(dir, view.right), ly = dot(dir, view.up), z = dot(dir, view.fwd);
  out.lx = lx; out.ly = ly; out.z = z; out.pan = lx;
  out.front = z > 0.05;
  if (out.front) {
    out.x = view.cx + (lx / z) * view.f;
    out.y = view.cy - (ly / z) * view.f;
  }
  return out;
}

export function angleTo(dir) {
  return Math.acos(Math.max(-1, Math.min(1, dot(dir, view.fwd))));
}

// Does a box of half-size (hw, hh) around a projected point show on the scanner's screen?
export function onScreen(p, hw, hh, inset = 0) {
  return p.front && p.x + hw > view.x0 + inset && p.x - hw < view.x0 + view.w - inset
    && p.y + hh > view.y0 + inset && p.y - hh < view.y0 + view.h - inset;
}
