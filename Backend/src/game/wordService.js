/**
 * WordService — Tiered word bank with optional Gemini AI generation
 *
 * Priority order for word sourcing:
 *   1. Google Gemini API (if GEMINI_API_KEY is set in .env)
 *   2. Built-in tiered word bank (always available, no network needed)
 *
 * Caching: Gemini responses cached in-memory for 1 hour per difficulty tier.
 * Per-room deduplication: usedWords Map prevents repeating words same game.
 */

const WORDS = {
  easy: [
    'cat','dog','sun','car','hat','fish','bird','tree','book','door',
    'star','moon','cake','ship','frog','crab','bear','duck','ball','bell',
    'rain','fire','snow','lamp','shoe','sock','ring','boat','drum','kite',
    'rose','leaf','milk','egg','key','bag','cup','fan','bee','ant',
    'owl','pig','fox','cow','lion','wolf','baby','hand','foot','eye',
    'nose','ear','arm','leg','box','pen','map','bed','bus','fly',
    'ice cream','hot dog','full moon','gold coin','red apple',
  ],
  medium: [
    'piano','castle','rocket','guitar','camera','candle','bridge','cactus',
    'dragon','ladder','mirror','pillow','robot','trophy','volcano','compass',
    'diamond','bottle','pencil','anchor','magnet','pizza','burger','coffee',
    'cookie','teapot','crown','sword','shield','bucket','basket','puzzle',
    'rainbow','tornado','island','cave','jungle','desert','valley','canyon',
    'snowman','campfire','sunrise','sunset','mushroom','backpack','starfish',
    'palm tree','race car','goldfish','cupcake','sailboat','firework',
    'jellyfish','light bulb','drum stick','sand castle','top hat',
  ],
  hard: [
    'gravity','paradox','mirage','vortex','entropy','eclipse','illusion',
    'solitude','phantom','odyssey','enigma','hologram','symphony','hypnosis',
    'alchemy','nebula','empathy','utopia','vertigo','insomnia',
    'black hole','time warp','dark magic','quicksand','whirlpool',
    'north star','wild fire','acid rain','deep sea','thin ice',
  ],
};

/** @type {Map<string,{words:string[],expiry:number}>} */
const geminiCache  = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, Set<string>>} */
const usedWordsByRoom = new Map();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

/**
 * Validates that a word meets drawing-game requirements:
 * 1-2 words max, each word ≤ 10 chars, letters and spaces only.
 */
function isValidWord(w) {
  if (!w || typeof w !== 'string') return false;
  const trimmed = w.trim().toLowerCase();
  if (trimmed.length < 2) return false;
  if (!/^[a-z ]+$/.test(trimmed)) return false;
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) return false;
  if (parts.some(p => p.length > 10 || p.length === 0)) return false;
  return true;
}

async function fetchFromGemini(difficulty, count = 12) {
  if (!GEMINI_KEY) return null;
  const prompt =
    `Generate ${count} random, common, family-friendly drawing game words. ` +
    `Each word must be one or two words maximum. Each individual word must be under 10 characters. ` +
    `Difficulty: "${difficulty}". Easy = simple everyday objects/animals. Medium = more specific objects/places. Hard = abstract concepts (but still drawable). ` +
    `Avoid special characters, proper nouns, and rare vocabulary. ` +
    `Return as a simple JSON array of lowercase strings.`;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.95 },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) { console.warn(`[WordService] Gemini HTTP ${res.status}`); return null; }
    const json  = await res.json();
    const text  = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse JSON array from response (may be wrapped in markdown code block)
    let parsed;
    try {
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: comma-separated parsing
      parsed = text.split(',').map(w => w.trim().toLowerCase().replace(/[^a-z ]/g, '')).filter(Boolean);
    }

    // Validate every word against drawing-game rules
    const valid = parsed
      .map(w => typeof w === 'string' ? w.toLowerCase().trim() : '')
      .filter(isValidWord);

    if (valid.length < 3) { console.warn(`[WordService] Gemini too few valid words (${valid.length})`); return null; }
    console.log(`[WordService] Gemini: ${valid.length} "${difficulty}" words`);
    return valid;
  } catch (err) { console.warn(`[WordService] Gemini error: ${err.message}`); return null; }
}

async function getPool(difficulty) {
  const cached = geminiCache.get(difficulty);
  if (cached && Date.now() < cached.expiry) return cached.words;
  const fresh = await fetchFromGemini(difficulty, 12);
  const pool  = fresh ?? [...(WORDS[difficulty] ?? WORDS.medium)];
  geminiCache.set(difficulty, { words: pool, expiry: Date.now() + CACHE_TTL_MS });
  return pool;
}

export async function getWordOptions(difficulty = 'medium', count = 3, roomId = '') {
  const pool   = await getPool(difficulty);
  const used   = usedWordsByRoom.get(roomId) ?? new Set();
  let   source = pool.filter(w => !used.has(w));
  if (source.length < count) source = [...pool];
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function markWordUsed(roomId, word) {
  if (!usedWordsByRoom.has(roomId)) usedWordsByRoom.set(roomId, new Set());
  usedWordsByRoom.get(roomId).add(word);
}

export function clearUsedWords(roomId) { usedWordsByRoom.delete(roomId); }

export function getRandomWord() {
  const arr = WORDS.medium;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function maskWord(word) {
  return word.split('').map(c => c === ' ' ? '  ' : '_').join(' ');
}

export function isCorrectGuess(guess, target) {
  if (!guess || !target) return false;
  return guess.trim().toLowerCase() === target.toLowerCase();
}

/**
 * Builds a partially-revealed hint string.
 * Revealed positions show the actual letter; others show '_'.
 * Spaces are always visible (shown as double space for readability).
 * @param {string} word
 * @param {number[]} revealedIndices - array of character indices to reveal
 * @returns {string}
 */
export function buildHint(word, revealedIndices) {
  const revealed = new Set(revealedIndices || []);
  return word.split('').map((c, i) => {
    if (c === ' ') return '  ';
    if (revealed.has(i)) return c;
    return '_';
  }).join(' ');
}

export function getWordCount() { return Object.values(WORDS).flat().length; }
