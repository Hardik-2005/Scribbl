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
  ],
  medium: [
    'piano','castle','rocket','guitar','camera','candle','bridge','cactus',
    'dragon','ladder','mirror','pillow','robot','trophy','volcano','compass',
    'diamond','bottle','pencil','umbrella','balloon','lantern','anchor','magnet',
    'pizza','burger','coffee','cookie','teapot','crown','sword','shield',
    'bucket','basket','puzzle','rainbow','tornado','binoculars','microscope',
    'telescope','parachute','submarine','helicopter','lighthouse','snowflake',
    'thunderstorm','waterfall','earthquake','avalanche','hurricane','eclipse',
    'jungle','desert','glacier','valley','canyon','island','reef','cave',
  ],
  hard: [
    'photosynthesis','democracy','evolution','gravity','ecosystem','renaissance',
    'constellation','labyrinth','metamorphosis','archaeology','hologram','quantum',
    'telepathy','illusion','serenade','philosophy','paradox','solitude','nostalgia',
    'entropy','silhouette','symmetry','perspective','reflection','mirage','vortex',
    'camouflage','turbulence','phenomenon','catastrophe','hibernation','migration',
    'architecture','civilization','revolution','expedition','exploration','discovery',
  ],
};

/** @type {Map<string,{words:string[],expiry:number}>} */
const geminiCache  = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** @type {Map<string, Set<string>>} */
const usedWordsByRoom = new Map();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

async function fetchFromGemini(difficulty, count = 18) {
  if (!GEMINI_KEY) return null;
  const prompt =
    `Give exactly ${count} single English nouns for a Pictionary drawing game. ` +
    `Difficulty: "${difficulty}". Easy=everyday objects/animals. Medium=complex objects/places. Hard=abstract/technical. ` +
    `Return ONLY a comma-separated list of lowercase words. No numbers or explanations.`;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 128, temperature: 0.95 },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) { console.warn(`[WordService] Gemini HTTP ${res.status}`); return null; }
    const json  = await res.json();
    const text  = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const words = text.split(',')
      .map(w => w.trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(w => w.length >= 2 && w.length <= 24);
    if (words.length < 3) { console.warn(`[WordService] Gemini too few words (${words.length})`); return null; }
    console.log(`[WordService] Gemini: ${words.length} "${difficulty}" words`);
    return words;
  } catch (err) { console.warn(`[WordService] Gemini error: ${err.message}`); return null; }
}

async function getPool(difficulty) {
  const cached = geminiCache.get(difficulty);
  if (cached && Date.now() < cached.expiry) return cached.words;
  const fresh = await fetchFromGemini(difficulty, 18);
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

export function getWordCount() { return Object.values(WORDS).flat().length; }
