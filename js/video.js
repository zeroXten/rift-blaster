// Rear camera into the hidden <video>. render.js draws it into the game canvas.

export const camera = { video: null, ready: false };

export async function startCamera() {
  if (camera.ready) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    // No mediaDevices at all means an insecure (http) page or a very old browser.
    throw Object.assign(new Error('camera unavailable'), { name: 'InsecureContext' });
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
  });
  const video = document.getElementById('cam');
  video.srcObject = stream;
  await video.play();
  camera.video = video;
  camera.ready = true;
}

// Browsers pause the stream when the tab is hidden.
export function resumeCamera() {
  if (camera.ready && camera.video.paused) camera.video.play().catch(() => {});
}
