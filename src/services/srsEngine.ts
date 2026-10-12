import { Word, WordProgress, SrsStage, DayForecast, DeckStatistics, PracticeMode } from '../types';

export const SRS_INTERVAL_DAYS: Record<SrsStage, number> = {
  0: 0,
  1: 1,   // Stage 1: Review after 1 day
  2: 3,   // Stage 2: Review after 3 days
  3: 7,   // Stage 3: Review after 7 days
  4: 14,  // Stage 4: Review after 14 days
  5: 30,  // Stage 5: Review after 30 days
  6: 60,  // Stage 6: Mastered (60 days)
};

export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function getDayDifference(dateA: string, dateB: string): number {
  const da = new Date(dateA);
  const db = new Date(dateB);
  const diffTime = da.getTime() - db.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function initializeWordProgress(wordId: number): WordProgress {
  return {
    wordId,
    stage: 0,
    exposed: false,
    timesSeen: 0,
    correctCount: 0,
    failCount: 0,
    consecutiveCorrect: 0,
    isForgotten: false,
    isMastered: false,
    history: [],
  };
}

/**
 * Update SRS progress after user practices a word
 */
export function recordWordPractice(
  current: WordProgress,
  isCorrect: boolean,
  mode: PracticeMode
): WordProgress {
  const today = getTodayString();
  const timesSeen = current.timesSeen + 1;
  const exposed = true;

  let failCount = current.failCount;
  let correctCount = current.correctCount;
  let consecutiveCorrect = current.consecutiveCorrect;
  let stage = current.stage;
  let isForgotten = current.isForgotten;

  if (isCorrect) {
    correctCount += 1;
    consecutiveCorrect += 1;
    // Advance stage
    if (stage < 6) {
      stage = (stage + 1) as SrsStage;
    }
    // If user previously forgot but now got it correct during review, relieve forgotten state
    if (isForgotten && consecutiveCorrect >= 2) {
      isForgotten = false;
    }
  } else {
    failCount += 1;
    consecutiveCorrect = 0;
    // Step down stage
    if (stage > 1) {
      stage = 1; // reset to 1-day interval
    }
    // User failed >= 2 times and hasn't reviewed successfully yet -> marked forgotten
    if (failCount >= 2) {
      isForgotten = true;
    }
  }

  // Mastered condition: "Khi từ đó user làm mọi câu đều đúng"
  // Exposed, at least 2 consecutive correct answers, and zero fails (or accuracy 100% with >= 3 trials)
  const isMastered = (correctCount >= 2 && failCount === 0) || (correctCount >= 5 && failCount <= 1 && consecutiveCorrect >= 3);

  const nextInterval = SRS_INTERVAL_DAYS[stage] || 1;
  const nextReviewDate = addDaysToDate(today, nextInterval);

  return {
    ...current,
    stage,
    exposed,
    timesSeen,
    correctCount,
    failCount,
    consecutiveCorrect,
    lastReviewedDate: today,
    nextReviewDate,
    isForgotten,
    isMastered,
    history: [
      ...current.history,
      { date: today, correct: isCorrect, mode },
    ],
  };
}

/**
 * Generate 7-day SRS review forecast (Today is always column 1)
 */
export function generate7DayForecast(
  progressMap: Record<number, WordProgress>
): DayForecast[] {
  const todayStr = getTodayString();
  const forecast: DayForecast[] = [];
  const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let offset = 0; offset < 7; offset++) {
    const curDateStr = addDaysToDate(todayStr, offset);
    const dateObj = new Date(curDateStr);
    const dayName = daysOfWeek[dateObj.getDay()];
    const dateDisplay = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

    let dueCount = 0;

    Object.values(progressMap).forEach((p) => {
      if (!p.exposed) return;

      if (offset === 0) {
        // Today: includes all words whose nextReviewDate <= today OR forgotten words
        if (!p.nextReviewDate || p.nextReviewDate <= todayStr || p.isForgotten) {
          dueCount++;
        }
      } else {
        // Future days: words scheduled exactly for that day
        if (p.nextReviewDate === curDateStr) {
          dueCount++;
        }
      }
    });

    forecast.push({
      dayOffset: offset,
      dateStr: curDateStr,
      label: offset === 0 ? 'Hôm nay' : `${dayName} ${dateDisplay}`,
      dueCount,
      isToday: offset === 0,
    });
  }

  return forecast;
}

/**
 * Compute aggregate statistics for the entire deck
 */
export function computeDeckStats(
  totalWords: number,
  progressMap: Record<number, WordProgress>
): DeckStatistics {
  const todayStr = getTodayString();
  let exposedCount = 0;
  let masteredCount = 0;
  let forgottenCount = 0;
  let readyToReviewCount = 0;

  Object.values(progressMap).forEach((p) => {
    if (p.exposed) {
      exposedCount++;
      if (p.isMastered) {
        masteredCount++;
      }
      if (p.isForgotten) {
        forgottenCount++;
      }
      // Ready to review today
      if (!p.nextReviewDate || p.nextReviewDate <= todayStr || p.isForgotten) {
        readyToReviewCount++;
      }
    }
  });

  return {
    totalWords,
    exposedCount,
    masteredCount,
    forgottenCount,
    readyToReviewCount,
    forecast7Days: generate7DayForecast(progressMap),
  };
}
