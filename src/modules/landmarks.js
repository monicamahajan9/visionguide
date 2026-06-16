const LANDMARK_KEYWORDS = [
  'door', 'elevator', 'stairs', 'staircase', 'reception', 'desk',
  'corridor', 'hallway', 'sign', 'exit', 'entrance', 'lobby',
  'window', 'counter', 'pillar', 'column', 'junction', 'corner',
];

let landmarks = [];
const MAX_LANDMARKS = 5;

/**
 * Extract landmark nouns from a navigation direction string and store them.
 * @param {string} direction
 */
export function extractLandmarks(direction) {
  const words = direction.toLowerCase().split(/\s+/);
  const found = LANDMARK_KEYWORDS.filter(k => words.some(w => w.includes(k)));
  if (found.length > 0) {
    // Add new landmarks, avoid duplicates, cap at MAX_LANDMARKS
    const newLandmarks = [...new Set([...landmarks, ...found])].slice(-MAX_LANDMARKS);
    landmarks = newLandmarks;
  }
}

/**
 * Get landmarks as a formatted string for the prompt.
 * @returns {string}
 */
export function getLandmarkContext() {
  if (landmarks.length === 0) return '';
  return `Landmarks already passed: ${landmarks.join(', ')}.`;
}

/**
 * Reset landmarks. Call at session start.
 */
export function resetLandmarks() {
  landmarks = [];
}
