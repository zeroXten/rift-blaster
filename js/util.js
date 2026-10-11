export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const pick = a => a[(Math.random() * a.length) | 0];

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported (iOS) */ }
}
