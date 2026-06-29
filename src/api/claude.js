import { getLandmarkContext } from '../modules/landmarks.js';
import { getGoalMemoryHint } from '../modules/goalMemory.js';
import { getSpatialMemoryHint } from '../modules/spatialMemory.js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY is not set.');
}

/**
 * @param {string} systemPrompt
 * @param {Array} messages       - Gemini contents array
 * @param {AbortSignal} [signal] - Aborts the in-flight request (e.g. on Stop)
 * @param {string} [model]       - Gemini model id; defaults to gemini-3.5-flash
 * @returns {Promise<object>}    - Parsed JSON from Gemini
 * @throws {Error}               - 'network_failure' | 'rate_limited' | 'api_error_<status>' | DOMException 'AbortError'
 */
export async function callClaude(systemPrompt, messages, signal, model = 'gemini-3.5-flash') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages,
        generationConfig: { maxOutputTokens: 500 },
      }),
      signal,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') throw networkErr;
    console.warn('Network error:', networkErr.message);
    throw new Error('network_failure', { cause: networkErr });
  }

  if (response.status === 429) {
    console.warn('Rate limited by Gemini API');
    throw new Error('rate_limited');
  }

  if (!response.ok) {
    console.warn('Gemini API error:', response.status);
    throw new Error(`api_error_${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn('JSON parse failed. Raw response:', text);
    return {
      obstacles: [],
      navigation_direction: '',
      goal_found: false,
      goal_confidence: 0,
    };
  }
}

/**
 * @param {string} goal          - User's destination string
 * @param {string[]} context     - Last 2 navigation_direction strings
 * @param {string} base64Frame   - JPEG base64 string (no data: prefix)
 * @returns {object}             - Gemini contents message object
 */
export function buildUserMessage(goal, context, base64Frame) {
  const contextText = context.length > 0
    ? `Prior directions: ${context.join(' → ')}`
    : 'No prior context.';

  const landmarkText = getLandmarkContext();
  const goalMemoryHint = getGoalMemoryHint();
  const spatialMemoryHint = getSpatialMemoryHint();

  const textParts = [
    `Goal: ${goal}`,
    contextText,
    landmarkText,
    goalMemoryHint,
    spatialMemoryHint,
    'Analyze this frame.',
  ].filter(Boolean).join('\n');

  return {
    role: 'user',
    parts: [
      { text: textParts },
      { inlineData: { mimeType: 'image/jpeg', data: base64Frame } },
    ],
  };
}

/**
 * @param {string} rawGoal - raw user utterance/typed text
 * @returns {object}        - Gemini contents message object (text-only, no image)
 */
export function buildDestinationMessage(rawGoal) {
  return {
    role: 'user',
    parts: [{ text: rawGoal }],
  };
}
