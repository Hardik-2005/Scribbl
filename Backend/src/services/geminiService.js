/**
 * GeminiService — Production-ready Gemini API word generation
 * ══════════════════════════════════════════════════════════════
 *
 * Generates drawing-game words via the Google Gemini API.
 * Features:
 *   • In-memory cache with configurable TTL
 *   • Timeout protection (AbortSignal)
 *   • Strict word validation (1-2 words, each ≤10 chars, etc.)
 *   • Fallback word generator when API is unavailable
 *   • Never exposes the API key to the frontend
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

// ── Cache ────────────────────────────────────────────────────────────────────
/** @type {Map<string, { words: string[], expiry: number }>} */
const cache     = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── Fallback word lists (minimal — used ONLY when Gemini is unreachable) ─────
const FALLBACK_WORDS = [
  'cat', 'dog', 'sun', 'car', 'hat', 'fish', 'bird', 'tree', 'book', 'door',
  'star', 'moon', 'cake', 'ship', 'frog', 'bear', 'duck', 'ball', 'bell',
  'rain', 'fire', 'snow', 'lamp', 'shoe', 'ring', 'boat', 'kite', 'rose',
  'milk', 'key', 'cup', 'bee', 'ant', 'owl', 'pig', 'fox', 'cow', 'bus',
  'piano', 'castle', 'rocket', 'guitar', 'camera', 'candle', 'bridge',
  'dragon', 'ladder', 'mirror', 'pillow', 'robot', 'trophy', 'compass',
  'diamond', 'pencil', 'anchor', 'pizza', 'coffee', 'cookie', 'crown',
  'sword', 'shield', 'bucket', 'puzzle', 'rainbow', 'island', 'snowman',
  'campfire', 'mushroom', 'backpack', 'starfish', 'cupcake', 'sailboat',
];

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Checks that a word meets drawing-game requirements:
 *   • Non-empty string, ≥ 2 chars total
 *   • 1 or 2 words max
 *   • Each word ≤ 10 characters
 *   • Only lowercase letters and spaces
 */
export function isValidWord(w) {
  if (!w || typeof w !== 'string') return false;
  const trimmed = w.trim().toLowerCase();
  if (trimmed.length < 2) return false;
  if (!/^[a-z ]+$/.test(trimmed)) return false;
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) return false;
  if (parts.some(p => p.length > 10 || p.length === 0)) return false;
  return true;
}

// ── Gemini API ───────────────────────────────────────────────────────────────

/**
 * Fetches words from the Gemini API.
 * @param {number} count - How many words to request (ask for more to filter)
 * @returns {Promise<string[]|null>} Validated words or null on failure
 */
async function fetchFromGemini(count = 12) {
  if (!GEMINI_KEY) {
    console.warn('[GeminiService] No GEMINI_API_KEY set — using fallback words');
    return null;
  }

  const prompt =
    `Generate ${count} simple drawing game words. ` +
    `Each word must be under 10 letters per word, maximum 2 words, easy to draw, ` +
    `no proper nouns, no offensive language. ` +
    `Words should be common everyday objects, animals, food, or simple actions. ` +
    `Return only a JSON array of lowercase strings.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.95 },
      }),
      signal: AbortSignal.timeout(6000), // 6 s timeout
    });

    if (!res.ok) {
      console.warn(`[GeminiService] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse JSON array (may be wrapped in markdown code fences)
    let parsed;
    try {
      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) throw new Error('No JSON array found');
      parsed = JSON.parse(match[0]);
    } catch {
      parsed = text
        .split(',')
        .map(w => w.trim().toLowerCase().replace(/[^a-z ]/g, ''))
        .filter(Boolean);
    }

    const valid = parsed
      .map(w => (typeof w === 'string' ? w.toLowerCase().trim() : ''))
      .filter(isValidWord);

    if (valid.length < 3) {
      console.warn(`[GeminiService] Too few valid words (${valid.length})`);
      return null;
    }

    console.log(`[GeminiService] Generated ${valid.length} words from Gemini`);
    return valid;
  } catch (err) {
    console.warn(`[GeminiService] Error: ${err.message}`);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a pool of validated words — Gemini first, fallback second.
 * Results are cached for CACHE_TTL milliseconds.
 * @returns {Promise<string[]>}
 */
export async function getWordPool() {
  const cacheKey = 'pool';
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.words;

  const fresh = await fetchFromGemini(12);
  const pool  = fresh ?? [...FALLBACK_WORDS];

  cache.set(cacheKey, { words: pool, expiry: Date.now() + CACHE_TTL });
  return pool;
}

/**
 * Picks `count` random words from the pool, avoiding `usedWords`.
 * @param {number} count
 * @param {Set<string>} usedWords
 * @returns {Promise<string[]>}
 */
export async function generateWords(count = 3, usedWords = new Set()) {
  const pool   = await getWordPool();
  let   source = pool.filter(w => !usedWords.has(w));
  if (source.length < count) source = [...pool]; // allow repeats if exhausted

  // Fisher-Yates shuffle
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/**
 * Returns a single random fallback word (used when all else fails).
 * @returns {string}
 */
export function getRandomFallbackWord() {
  return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
}

/**
 * Clears the in-memory cache (useful for testing).
 */
export function clearCache() {
  cache.clear();
}
