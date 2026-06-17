// src/modules/gyroscope.js
//
// Singleton tracking device yaw rate during scan phase. Gating applies only
// in scan phase — explore and navigate phases never call into this module.

import { SCAN_YAW_THRESHOLD_DEG_S, SCAN_YAW_DEBOUNCE_MS } from '../constants.js';

let currentYawRate = 0;
let lastWarnedAt = 0;
let listening = false;

/**
 * Start listening to DeviceMotionEvent. Call inside the Start tap handler
 * (not on page load) — DeviceMotionEvent requires a user gesture on some
 * Android versions. Safe to call multiple times; only attaches once.
 */
export function initGyroscope() {
  if (listening) return;
  if (typeof DeviceMotionEvent === 'undefined') return;

  window.addEventListener('devicemotion', (event) => {
    currentYawRate = Math.abs(event.rotationRate?.alpha ?? 0);
  });
  listening = true;
}

/**
 * @returns {boolean} true if yaw rate exceeds SCAN_YAW_THRESHOLD_DEG_S.
 * Always false if DeviceMotionEvent is unavailable, so scan phase is never
 * blocked on devices without gyroscope support.
 */
export function isRotatingTooFast() {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  return currentYawRate > SCAN_YAW_THRESHOLD_DEG_S;
}

/**
 * @returns {boolean} true at most once per SCAN_YAW_DEBOUNCE_MS.
 * Updates the last-warned timestamp on each true return.
 */
export function shouldWarnRotationSpeed() {
  const now = Date.now();
  if (now - lastWarnedAt < SCAN_YAW_DEBOUNCE_MS) return false;
  lastWarnedAt = now;
  return true;
}
