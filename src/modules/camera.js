import { speak } from './speech.js';

const FRAME_WIDTH  = 640;
const FRAME_HEIGHT = 480;
const JPEG_QUALITY = 0.7;
const FROZEN_FRAME_THRESHOLD = 3; // 3 consecutive identical frames = frozen

let wakeLock = null;
let visibilityHandler = null;

const canvas = document.createElement('canvas');
canvas.width  = FRAME_WIDTH;
canvas.height = FRAME_HEIGHT;
const ctx = canvas.getContext('2d');

/**
 * Initialize camera stream and attach to video element.
 * Requests WakeLock. Speaks error if camera denied.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 * @throws {Error} if camera permission denied
 */
export async function initCamera(videoEl) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: FRAME_WIDTH },
        height: { ideal: FRAME_HEIGHT },
      },
    });
  } catch (err) {
    speak('Camera access is required. Please allow camera in browser settings.');
    throw err;
  }

  videoEl.srcObject = stream;
  await videoEl.play();

  // Request WakeLock
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    speak('Please keep the screen on manually during navigation.');
  }

  // Re-acquire WakeLock when the app comes back to the foreground —
  // the system releases WakeLock automatically when the tab is backgrounded.
  visibilityHandler = async () => {
    if (document.visibilityState === 'visible' && wakeLock === null) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch { /* silent — WakeLock is best-effort */ }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  return stream;
}

/**
 * Stop camera stream, release WakeLock, and remove the visibility listener.
 * @param {MediaStream} stream
 */
export async function stopCamera(stream) {
  stream?.getTracks().forEach(t => t.stop());
  try { await wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }

  resetFrozenFrameDetector();
}

/**
 * Re-initialize camera stream on frozen frame detection.
 * @param {HTMLVideoElement} videoEl
 * @param {MediaStream} currentStream
 * @returns {Promise<MediaStream>} new stream
 */
export async function reinitCamera(videoEl, currentStream) {
  console.warn('Frozen frame detected — re-initializing camera stream');
  await stopCamera(currentStream);
  return initCamera(videoEl);
}

/**
 * Capture current video frame as base64 JPEG.
 * Returns null if video is not ready.
 * @param {HTMLVideoElement} videoEl
 * @returns {string | null} base64 JPEG without data: prefix
 */
export function getFrame(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null;
  ctx.drawImage(videoEl, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return dataUrl.split(',')[1];  // Strip 'data:image/jpeg;base64,' prefix
}

// --- Frozen frame detection ---
// Compares the current frame to the previous one. If identical for
// FROZEN_FRAME_THRESHOLD consecutive cycles, the stream is considered frozen.
let lastFrameData = null;
let frozenFrameCount = 0;

/**
 * Check if the current frame is identical to the previous one.
 * Resets count on any change.
 * @param {string} frame - base64 JPEG string
 * @returns {boolean} true if stream appears frozen
 */
export function checkFrozenFrame(frame) {
  if (frame === lastFrameData) {
    frozenFrameCount++;
  } else {
    frozenFrameCount = 0;
    lastFrameData = frame;
  }
  return frozenFrameCount >= FROZEN_FRAME_THRESHOLD;
}

export function resetFrozenFrameDetector() {
  lastFrameData = null;
  frozenFrameCount = 0;
}
