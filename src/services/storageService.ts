import { Word, WordProgress } from '../types';
import { DEFAULT_HSK3_WORDS } from '../data/hsk3Words';
import { initializeWordProgress } from './srsEngine';

const STORAGE_KEY_WORDS = 'hsk3_words_catalog_v3';
const STORAGE_KEY_PROGRESS = 'hsk3_srs_progress_v3';

export function loadStoredWords(): Word[] {
  if (typeof window === 'undefined') return DEFAULT_HSK3_WORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORDS);
    if (!raw) {
      saveStoredWords(DEFAULT_HSK3_WORDS);
      return DEFAULT_HSK3_WORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HSK3_WORDS;
  } catch (e) {
    console.error('Error loading stored words', e);
    return DEFAULT_HSK3_WORDS;
  }
}

export function saveStoredWords(words: Word[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
  } catch (e) {
    console.error('Error saving stored words', e);
  }
}

export function loadStoredProgress(words: Word[]): Record<number, WordProgress> {
  const result: Record<number, WordProgress> = {};
  
  // Initialize baseline
  words.forEach((w) => {
    result[w.id] = initializeWordProgress(w.id);
  });

  if (typeof window === 'undefined') return result;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      const parsed: Record<number, WordProgress> = JSON.parse(raw);
      words.forEach((w) => {
        if (parsed[w.id]) {
          result[w.id] = { ...result[w.id], ...parsed[w.id] };
        }
      });
    }
  } catch (e) {
    console.error('Error loading stored progress', e);
  }

  return result;
}

export function saveStoredProgress(progress: Record<number, WordProgress>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving stored progress', e);
  }
}

export function exportBackupData(): string {
  const words = loadStoredWords();
  const progress = loadStoredProgress(words);
  return JSON.stringify({
    version: 2,
    timestamp: new Date().toISOString(),
    words,
    progress,
  }, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.words && Array.isArray(data.words)) {
      saveStoredWords(data.words);
    }
    if (data.progress && typeof data.progress === 'object') {
      saveStoredProgress(data.progress);
    }
    return true;
  } catch (e) {
    console.error('Failed to import backup data', e);
    return false;
  }
}

export function resetAllProgress(words: Word[]): Record<number, WordProgress> {
  const fresh: Record<number, WordProgress> = {};
  words.forEach((w) => {
    fresh[w.id] = initializeWordProgress(w.id);
  });
  saveStoredProgress(fresh);
  return fresh;
}
