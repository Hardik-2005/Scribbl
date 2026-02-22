/**
 * WordService - Manages word selection for drawing game
 * Provides random word selection from a hardcoded list
 */

const WORD_LIST = [
  'apple',
  'banana',
  'car',
  'tree',
  'house',
  'computer',
  'phone',
  'book',
  'chair',
  'table',
  'dog',
  'cat',
  'fish',
  'bird',
  'flower',
  'sun',
  'moon',
  'star',
  'cloud',
  'mountain',
  'pizza',
  'burger',
  'coffee',
  'guitar',
  'piano',
  'camera',
  'bicycle',
  'airplane',
  'boat',
  'train',
  'pencil',
  'paint',
  'bottle',
  'clock',
  'lamp',
  'umbrella',
  'key',
  'door',
  'window',
  'heart',
  'smile',
  'rainbow',
  'castle',
  'bridge',
  'rocket',
  'robot',
  'dragon',
  'crown',
  'sword',
  'shield'
];

/**
 * Gets a random word from the word list
 * @returns {string} Random word
 */
export function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
}

/**
 * Masks a word for non-drawer players
 * @param {string} word - The word to mask
 * @returns {string} Masked word (e.g., "apple" -> "_ _ _ _ _")
 */
export function maskWord(word) {
  return word.split('').map(char => char === ' ' ? '  ' : '_').join(' ');
}

/**
 * Validates if a guess matches the target word (case-insensitive)
 * @param {string} guess - Player's guess
 * @param {string} targetWord - The correct word
 * @returns {boolean} True if guess is correct
 */
export function isCorrectGuess(guess, targetWord) {
  if (!guess || !targetWord) return false;
  return guess.trim().toLowerCase() === targetWord.toLowerCase();
}

/**
 * Gets the total number of words available
 * @returns {number} Word count
 */
export function getWordCount() {
  return WORD_LIST.length;
}
