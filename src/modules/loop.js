// src/modules/loop.js

import { getFrame, checkFrozenFrame, reinitCamera } from './camera.js';
import { callClaude, buildUserMessage } from '../api/claude.js';
import { buildSystemPrompt } from '../prompts/system.js';
import { speak } from './speech.js';
import { routeObstacles, resetObstacles } from './obstacles.js';
import { trackGoal, resetGoalTracker } from './goalTracker.js';
import { extractLandmarks, resetLandmarks } from './landmarks.js';
import {
  LOOP_INTERVAL_MS,
  API_TIMEOUT_MS,
  STALE_FRAME_MS,
  SILENCE_HOLDOFF_MS,
  DEV_MODE,
} from '../constants.js';

let intervalId = null;
let pending = false;
let lastSilenceFiredAt = 0;

/**
 * Start the navigation loop.
 *
 * @param {HTMLVideoElement} videoEl      - Live camera feed element
 * @param {React.MutableRefObject} streamRef - Ref to the active MediaStream (updatable on frozen-frame reinit)
 * @param {React.MutableRefObject} stateRef - Ref containing { goal: string, context: string[] }
 *                                           Use a ref (not state) so the interval always reads
 *                                           fresh values without needing to restart the loop.
 * @param {object} callbacks
 * @param {function} callbacks.onSpeak          - Called with spoken text string (updates StatusDisplay)
 * @param {function} callbacks.onContextUpdate  - Called with navigation_direction string (updates context array)
 * @param {function} callbacks.onArrival        - Called when goal is confirmed reached
 * @param {function} callbacks.onError          - Called with error string on API failure
 */
export function startLoop(videoEl, streamRef, stateRef, callbacks) {
  if (intervalId !== null) return; // Prevent double-start

  resetObstacles();
  resetGoalTracker();
  resetLandmarks();

  intervalId = setInterval(async () => {
    // Guard: skip if prior call is still in flight
    if (pending) return;

    // Capture frame
    const frame = getFrame(videoEl);
    if (!frame) return; // Video not ready yet

    // Frozen frame detection — camera stream stuck on the same frame
    if (checkFrozenFrame(frame)) {
      console.warn('Frozen frame detected — reinitializing stream');
      try {
        streamRef.current = await reinitCamera(videoEl, streamRef.current);
      } catch {
        speak('Camera stopped. Please reload the page.');
        callbacks.onSpeak('Camera stopped. Please reload the page.');
        stopLoop();
      }
      return;
    }

    const capturedAt = Date.now();
    pending = true;

    // Silence fallback: if no response within API_TIMEOUT_MS, speak holding message
    // throttled to once per SILENCE_HOLDOFF_MS so a slow API doesn't trigger it every cycle
    let silenceFired = false;
    const silenceTimer = setTimeout(() => {
      const now = Date.now();
      if (now - lastSilenceFiredAt >= SILENCE_HOLDOFF_MS) {
        speak('Still scanning');
        callbacks.onSpeak('Still scanning');
        lastSilenceFiredAt = now;
        silenceFired = true;
      }
    }, API_TIMEOUT_MS);

    try {
      const { goal, context } = stateRef.current;

      const result = await callClaude(
        buildSystemPrompt('navigation'),
        [buildUserMessage(goal, context, frame)]
      );

      clearTimeout(silenceTimer);

      // Drop stale responses — user has moved too far for this frame to be actionable
      if (Date.now() - capturedAt > STALE_FRAME_MS) {
        if (DEV_MODE) console.debug('Stale frame dropped', Date.now() - capturedAt, 'ms old');
        return;
      }

      // Route obstacles first — may interrupt speech
      if (result.obstacles?.length > 0) {
        routeObstacles(result.obstacles);
      }

      // Speak navigation direction
      if (result.navigation_direction) {
        speak(result.navigation_direction);
        callbacks.onSpeak(result.navigation_direction);
        callbacks.onContextUpdate(result.navigation_direction);
        extractLandmarks(result.navigation_direction);
      }

      // Check goal arrival
      const arrived = trackGoal(result.goal_found, result.goal_confidence);
      if (arrived) {
        speak(`You have arrived at ${goal}`, true);
        callbacks.onSpeak(`Arrived at ${goal}`);
        callbacks.onArrival();
        stopLoop();
      }

    } catch (err) {
      clearTimeout(silenceTimer);

      if (err.message === 'rate_limited') {
        speak('Connection slow. Pausing briefly.');
        callbacks.onSpeak('Connection slow. Pausing briefly.');
        // Back off: pause the loop for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (!silenceFired) {
        const now = Date.now();
        if (now - lastSilenceFiredAt >= SILENCE_HOLDOFF_MS) {
          speak('Still scanning');
          callbacks.onSpeak('Still scanning');
          lastSilenceFiredAt = now;
        }
      }

      callbacks.onError(err.message);
      console.error('Loop error:', err.message);
    } finally {
      pending = false;
    }

  }, LOOP_INTERVAL_MS);
}

/**
 * Stop the navigation loop. Safe to call if loop is not running.
 */
export function stopLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  pending = false;
  lastSilenceFiredAt = 0;
}

/**
 * Check if loop is currently running.
 * @returns {boolean}
 */
export function isLoopRunning() {
  return intervalId !== null;
}
