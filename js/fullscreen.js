// Full screen, in and out. Browsers only allow entering it from a tap or key press.
// iPhones have no full-screen API for pages: there the game runs full screen only when it is
// opened from a Home Screen icon.

const doc = document, el = doc.documentElement;
const request = el.requestFullscreen || el.webkitRequestFullscreen;
const exit = doc.exitFullscreen || doc.webkitExitFullscreen;

export const fullscreen = {
  supported: !!request,
  // Launched from the Home Screen, so already full screen with nothing to toggle.
  standalone: navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,
  get on() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); },
};

// lockLandscape also turns the screen sideways where the browser can (Android), which works
// even for a phone with rotation locked.
export function enterFullscreen(lockLandscape = false) {
  if (!request || fullscreen.on) return;
  Promise.resolve(request.call(el))
    .then(() => lockLandscape && screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

export function exitFullscreen() {
  if (!fullscreen.on) return;
  try { screen.orientation?.unlock?.(); } catch { /* nothing was locked */ }
  Promise.resolve(exit.call(doc)).catch(() => {});
}
