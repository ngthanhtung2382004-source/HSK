import { Word } from '../types';
import { parseAnkiOrCsvText } from '../services/ankiParser';
import { USER_ANKI_CSV_DATA } from './userDeckRaw';

// Parse the user's provided Anki CSV dataset
const PARSED_USER_DECK = parseAnkiOrCsvText(USER_ANKI_CSV_DATA).words;

export const DEFAULT_HSK3_WORDS: Word[] = PARSED_USER_DECK;

/**
 * Intelligent distractor / confused words generator
 * Looks for words with similar length, shared character, or random distractors from the deck
 */
export function getConfusedWords(targetWord: Word, allWords: Word[], count: number = 3): Word[] {
  const targetChars = new Set(targetWord.hanzi.split(''));
  
  // 1. Try words that share at least one character
  const sharingChar = allWords.filter(
    (w) => w.id !== targetWord.id && w.hanzi.split('').some((c) => targetChars.has(c))
  );

  // 2. Try words of exact same length
  const sameLength = allWords.filter(
    (w) => w.id !== targetWord.id && w.hanzi.length === targetWord.hanzi.length && !sharingChar.includes(w)
  );

  // 3. Fallback other words
  const pool = [...sharingChar, ...sameLength, ...allWords.filter((w) => w.id !== targetWord.id)];

  // Pick unique `count` words
  const selected: Word[] = [];
  const chosenIds = new Set<number>();
  chosenIds.add(targetWord.id);

  for (const w of pool) {
    if (!chosenIds.has(w.id)) {
      chosenIds.add(w.id);
      selected.push(w);
      if (selected.length >= count) break;
    }
  }

  // If still fewer than count, take any
  while (selected.length < count && allWords.length > selected.length + 1) {
    const randomW = allWords[Math.floor(Math.random() * allWords.length)];
    if (!chosenIds.has(randomW.id)) {
      chosenIds.add(randomW.id);
      selected.push(randomW);
    }
  }

  return selected;
}
