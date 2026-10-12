export interface Word {
  id: number;
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  example: string;
  examplePinyin: string;
  exampleVi: string;
  confusedWith?: string[]; // Lookalike or confusable hanzi
  radical?: string;        // Bộ thủ
  hskLevel?: number;       // default 3
}

export type SrsStage = 0 | 1 | 2 | 3 | 4 | 5 | 6; 
// 0: Unseen
// 1: Learning (1 day)
// 2: Review 1 (3 days)
// 3: Review 2 (7 days)
// 4: Review 3 (14 days)
// 5: Retained (30 days)
// 6: Mastered (60 days)

export interface WordProgress {
  wordId: number;
  stage: SrsStage;
  exposed: boolean;
  timesSeen: number;
  correctCount: number;
  failCount: number;
  consecutiveCorrect: number;
  lastReviewedDate?: string; // YYYY-MM-DD
  nextReviewDate?: string;   // YYYY-MM-DD
  isForgotten: boolean;      // Exposed + failed >= 2 and not yet reviewed
  isMastered: boolean;       // Never failed or 100% accuracy with >= 3 reviews
  history: {
    date: string;
    correct: boolean;
    mode: PracticeMode;
  }[];
}

export type PracticeMode = 
  | 'mc_confused'      // 1. Multiple choice với 3 từ dễ nhầm lẫn
  | 'fill_blank'       // 2. Điền vào chỗ trống ví dụ
  | 'vi_to_hanzi'      // 3. Hiện nghĩa tiếng Việt, chọn từ tiếng Trung
  | 'hanzi_to_vi_type' // 4. Hiện từ tiếng Trung, gõ nghĩa tiếng Việt
  | 'sentence_trans'   // 5. Dịch full ví dụ từ Trung sang Việt
  | 'riddle';          // 6. Câu đố mẹo nhớ mặt chữ chiết tự

export interface SessionConfig {
  type: 'learn_new' | 'review_srs' | 'review_forgotten' | 'custom';
  batchSize: number; // default 40
  modes: PracticeMode[];
  hidePinyinDefault: boolean; // Ép nhớ mặt chữ
}

export interface DayForecast {
  dayOffset: number; // 0 = Today
  dateStr: string;   // YYYY-MM-DD
  label: string;     // "Hôm nay", "T2 13/10", ...
  dueCount: number;
  isToday: boolean;
}

export interface DeckStatistics {
  totalWords: number;
  exposedCount: number;
  masteredCount: number;
  forgottenCount: number;
  readyToReviewCount: number;
  forecast7Days: DayForecast[];
}
