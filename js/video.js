// Rear camera into the hidden <video>. render.js draws it into the game canvas.

export const camera = { video: null, ready: false };

let asking = null;

// Asks for the camera. Resolves once a stream has been granted; rejects if it is refused,
// unavailable, or (with patience, in milliseconds) if there is still no answer after that long.
// A stream that turns up after the caller has stopped waiting is still attached, so the feed
// appears whenever the permission prompt is finally answered.
export function startCamera(patience = 0) {
  if (camera.ready) return Promise.resolve();
  if (!navigator.mediaDevices?.getUserMedia) {
    // No mediaDevices at all means an insecure (http) page or a very old browser.
    return Promise.reject(Object.assign(new Error('camera unavailable'), { name: 'InsecureContext' }));
  }
  asking ||= navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
  }).then(stream => {
    const video = document.getElementById('cam');
    video.srcObject = stream;
    // Not waited for: frames are drawn as they arrive, and a video that is slow to start
    // must not hold the game up.
    video.play().catch(() => {});
    camera.video = video;
    camera.ready = true;
  }).finally(() => { asking = null; });
  if (!patience) return asking;
  return Promise.race([
    asking,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('no answer'), { name: 'Timeout' })), patience)),
  ]);
}

// Browsers pause the stream when the tab is hidden.
export function resumeCamera() {
  if (camera.ready && camera.video.paused) camera.video.play().catch(() => {});
}
