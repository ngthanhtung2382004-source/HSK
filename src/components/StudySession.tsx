import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Word, WordProgress, PracticeMode } from '../types';
import { audioService } from '../services/audioService';
import { getConfusedWords } from '../data/hsk3Words';
import { getSentencePinyin } from '../services/pinyinService';
import { HSK3_RIDDLES, getWordMnemonic, MnemonicRiddle } from '../data/hsk3Mnemonics';
import {
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Eye,
  Shuffle,
  Lightbulb,
  Puzzle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudySessionProps {
  sessionWords: Word[];
  allWords: Word[];
  progressMap: Record<number, WordProgress>;
  sessionTitle: string;
  onRecordResult: (wordId: number, isCorrect: boolean, mode: PracticeMode) => void;
  onFinishSession: () => void;
}

interface SessionCard {
  id: string;
  word: Word;
  mode: PracticeMode;
  riddle?: MnemonicRiddle;
}

interface Question {
  word: Word;
  mode: PracticeMode;
  options: {
    label: string;
    value: string | number;
    isCorrect: boolean;
  }[];
  questionText: string;
  subText?: string;
  blankSentence?: string;
  correctAnswerText: string;
  fullQuestionPinyin: string;
  riddleExplanation?: string;
}

/**
 * Thuật toán Interleaved Shuffle thông minh:
 * - Trộn ngẫu nhiên câu hỏi giữa các từ khác nhau
 * - Đảm bảo KHÔNG có 2 câu hỏi nào của cùng 1 từ xuất hiện liên tiếp nhau
 * - Giãn cách các lần xuất hiện của cùng một từ để người học phải tư duy kích hoạt trí nhớ dài hạn (Spaced Retrieval)
 * - Chèn xen kẽ câu đố mẹo nhớ mặt chữ (Mnemonic Riddles) sau mỗi 8 câu hỏi
 */
function buildInterleavedSessionCards(words: Word[], modes: PracticeMode[]): SessionCard[] {
  if (words.length === 0) return [];

  const wordModesMap = new Map<number, PracticeMode[]>();
  words.forEach((w) => {
    wordModesMap.set(w.id, [...modes].sort(() => Math.random() - 0.5));
  });

  const cards: SessionCard[] = [];

  // Tạo 5 vòng kiểm tra đan xen giữa các từ
  for (let round = 0; round < modes.length; round++) {
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);

    if (cards.length > 0 && shuffledWords.length > 1 && cards[cards.length - 1].word.id === shuffledWords[0].id) {
      const swapIndex = Math.floor(Math.random() * (shuffledWords.length - 1)) + 1;
      const temp = shuffledWords[0];
      shuffledWords[0] = shuffledWords[swapIndex];
      shuffledWords[swapIndex] = temp;
    }

    shuffledWords.forEach((word) => {
      const assignedModes = wordModesMap.get(word.id) || modes;
      const mode = assignedModes[round] || modes[round % modes.length];
      cards.push({
        id: `${word.id}-${mode}-${round}-${Math.random().toString(36).substring(2, 6)}`,
        word,
        mode,
      });
    });
  }

  // Chèn xen kẽ các câu đố mẹo nhớ mặt chữ (Mnemonic Riddle) vào giữa session
  const availableRiddles = [...HSK3_RIDDLES].sort(() => Math.random() - 0.5);
  let riddleIndex = 0;
  const cardsWithRiddles: SessionCard[] = [];

  cards.forEach((card, idx) => {
    cardsWithRiddles.push(card);

    // Chèn câu đố mẹo sau mỗi 8 câu hỏi
    if ((idx + 1) % 8 === 0 && riddleIndex < availableRiddles.length) {
      const riddle = availableRiddles[riddleIndex++];
      const matchedWord = words.find((w) => w.hanzi === riddle.hanzi) || {
        id: 9000 + riddleIndex,
        hanzi: riddle.hanzi,
        pinyin: riddle.pinyin,
        vietnamese: riddle.meaning,
        example: riddle.riddle,
        examplePinyin: '',
        exampleVi: riddle.explanation,
      };

      cardsWithRiddles.push({
        id: `riddle-${riddleIndex}-${Math.random().toString(36).substring(2, 6)}`,
        word: matchedWord,
        mode: 'riddle',
        riddle,
      });
    }
  });

  return cardsWithRiddles;
}

export const StudySession: React.FC<StudySessionProps> = ({
  sessionWords,
  allWords,
  progressMap,
  sessionTitle,
  onRecordResult,
  onFinishSession,
}) => {
  const practiceModes: PracticeMode[] = useMemo(
    () => ['mc_confused', 'fill_blank', 'vi_to_hanzi', 'hanzi_to_vi_type', 'sentence_trans'],
    []
  );

  const sessionCards = useMemo(() => {
    return buildInterleavedSessionCards(sessionWords, practiceModes);
  }, [sessionWords, practiceModes]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userTypedAnswer, setUserTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Auto-audio toggle
  const [autoSoundEnabled, setAutoSoundEnabled] = useState(true);

  // Pinyin luôn mờ
  const [isQuestionPinyinRevealed, setIsQuestionPinyinRevealed] = useState(false);
  const [isKnowledgePinyinRevealed, setIsKnowledgePinyinRevealed] = useState(false);

  const [sessionResults, setSessionResults] = useState<{ wordId: number; isCorrect: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const currentCard = sessionCards[currentCardIndex];
  const currentWord = currentCard?.word;
  const currentMode = currentCard?.mode;

  // Tạo câu hỏi
  const currentQuestion = useMemo<Question | null>(() => {
    if (!currentWord || !currentMode) return null;

    if (currentMode === 'riddle' && currentCard.riddle) {
      const riddle = currentCard.riddle;
      const opts = [
        { label: riddle.hanzi, value: riddle.hanzi, isCorrect: true },
        ...riddle.distractors.map((d) => ({ label: d, value: d, isCorrect: false })),
      ].sort(() => Math.random() - 0.5);

      return {
        word: currentWord,
        mode: 'riddle',
        questionText: riddle.riddle,
        subText: 'Thử thách câu đố mẹo: Đọc câu đố chiết tự và chọn chữ Hán tương ứng:',
        options: opts,
        correctAnswerText: `${riddle.hanzi} [${riddle.pinyin}]: ${riddle.meaning}`,
        fullQuestionPinyin: riddle.pinyin,
        riddleExplanation: riddle.explanation,
      };
    }

    const distractors = getConfusedWords(currentWord, allWords, 3);
    const rawExample = currentWord.example || `${currentWord.hanzi}。`;

    switch (currentMode) {
      case 'mc_confused': {
        const opts = [
          { label: currentWord.vietnamese, value: currentWord.id, isCorrect: true },
          ...distractors.map((d) => ({ label: d.vietnamese, value: d.id, isCorrect: false })),
        ].sort(() => Math.random() - 0.5);

        return {
          word: currentWord,
          mode: 'mc_confused',
          questionText: currentWord.hanzi,
          subText: 'Chọn nghĩa tiếng Việt chính xác (Tránh bẫy các từ dễ nhầm lẫn):',
          options: opts,
          correctAnswerText: `${currentWord.hanzi} [${currentWord.pinyin}]: ${currentWord.vietnamese}`,
          fullQuestionPinyin: currentWord.pinyin,
        };
      }

      case 'fill_blank': {
        const blanked = rawExample.includes(currentWord.hanzi)
          ? rawExample.replace(currentWord.hanzi, ' ______ ')
          : `______ (${rawExample})`;

        const fullSentencePinyin = getSentencePinyin(rawExample, allWords);

        const opts = [
          { label: currentWord.hanzi, value: currentWord.id, isCorrect: true },
          ...distractors.map((d) => ({ label: d.hanzi, value: d.id, isCorrect: false })),
        ].sort(() => Math.random() - 0.5);

        return {
          word: currentWord,
          mode: 'fill_blank',
          questionText: 'Điền từ tiếng Trung thích hợp vào chỗ trống:',
          blankSentence: blanked,
          subText: currentWord.exampleVi ? `Gợi ý: "${currentWord.exampleVi}"` : undefined,
          options: opts,
          correctAnswerText: `${currentWord.hanzi} [${currentWord.pinyin}] - ${currentWord.vietnamese}`,
          fullQuestionPinyin: fullSentencePinyin,
        };
      }

      case 'vi_to_hanzi': {
        const opts = [
          { label: currentWord.hanzi, value: currentWord.id, isCorrect: true },
          ...distractors.map((d) => ({ label: d.hanzi, value: d.id, isCorrect: false })),
        ].sort(() => Math.random() - 0.5);

        return {
          word: currentWord,
          mode: 'vi_to_hanzi',
          questionText: currentWord.vietnamese,
          subText: 'Chọn chữ Hán tương ứng với nghĩa trên:',
          options: opts,
          correctAnswerText: `${currentWord.hanzi} [${currentWord.pinyin}]`,
          fullQuestionPinyin: currentWord.pinyin,
        };
      }

      case 'hanzi_to_vi_type': {
        return {
          word: currentWord,
          mode: 'hanzi_to_vi_type',
          questionText: currentWord.hanzi,
          subText: 'Nhìn chữ Hán trên và gõ nghĩa tiếng Việt vào ô bên dưới:',
          options: [],
          correctAnswerText: currentWord.vietnamese,
          fullQuestionPinyin: currentWord.pinyin,
        };
      }

      case 'sentence_trans': {
        const fullSentencePinyin = getSentencePinyin(rawExample, allWords);

        return {
          word: currentWord,
          mode: 'sentence_trans',
          questionText: rawExample,
          subText: 'Đọc câu ví dụ tiếng Trung bên dưới và tập dịch câu đó sang tiếng Việt:',
          options: [],
          correctAnswerText: `${currentWord.hanzi} [${currentWord.pinyin}]: ${currentWord.vietnamese}`,
          fullQuestionPinyin: fullSentencePinyin,
        };
      }

      default:
        return null;
    }
  }, [currentWord, currentMode, currentCard, allWords]);

  useEffect(() => {
    if (currentCard) {
      setIsAnswered(false);
      setSelectedOption(null);
      setUserTypedAnswer('');
      setIsCorrect(false);
      setIsQuestionPinyinRevealed(false);
      setIsKnowledgePinyinRevealed(false);

      if (currentMode === 'hanzi_to_vi_type' || currentMode === 'sentence_trans') {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [currentCardIndex, currentCard, currentMode]);

  if (!currentCard || !currentWord || !currentQuestion) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-xl mx-auto text-center border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Không có câu hỏi trong session!</h2>
        <button
          onClick={onFinishSession}
          className="mt-4 px-6 py-2.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 rounded-xl text-sm font-semibold cursor-pointer"
        >
          Quay lại màn hình chính
        </button>
      </div>
    );
  }

  const normalizeVi = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  };

  const handleSelectOption = (option: { value: string | number; isCorrect: boolean }) => {
    if (isAnswered) return;
    setSelectedOption(option.value);
    setIsAnswered(true);
    setIsCorrect(option.isCorrect);

    if (currentMode !== 'riddle') {
      onRecordResult(currentWord.id, option.isCorrect, currentMode);
      setSessionResults((prev) => [...prev, { wordId: currentWord.id, isCorrect: option.isCorrect }]);
    }

    if (autoSoundEnabled) {
      audioService.speak(currentWord.hanzi);
    }
  };

  const handleSubmitTyping = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !userTypedAnswer.trim()) return;

    let matches = false;

    if (currentMode === 'sentence_trans') {
      matches = userTypedAnswer.trim().length >= 3;
    } else {
      const userNorm = normalizeVi(userTypedAnswer);
      const targetNorm = normalizeVi(currentWord.vietnamese);

      const targetParts = currentWord.vietnamese
        .split(/[,;/()]+/)
        .map((s) => normalizeVi(s))
        .filter((s) => s.length > 0);

      matches =
        userNorm === targetNorm ||
        targetParts.some((part) => userNorm.includes(part) || part.includes(userNorm)) ||
        (userNorm.length >= 3 && targetNorm.includes(userNorm));
    }

    setIsAnswered(true);
    setIsCorrect(matches);

    onRecordResult(currentWord.id, matches, currentMode);
    setSessionResults((prev) => [...prev, { wordId: currentWord.id, isCorrect: matches }]);

    if (autoSoundEnabled) {
      if (currentMode === 'sentence_trans') {
        audioService.speak(currentWord.example || currentWord.hanzi);
      } else {
        audioService.speak(currentWord.hanzi);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentCardIndex + 1 < sessionCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setIsCompleted(true);
    }
  };

  if (isCompleted) {
    const totalCount = sessionResults.length;
    const correctCount = sessionResults.filter((r) => r.isCorrect).length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg mx-auto text-center border border-slate-200 dark:border-slate-800 shadow-md transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white font-serif mb-2">
          Hoàn thành Session!
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Đã luyện tập xong <strong className="text-slate-800 dark:text-slate-200">{sessionWords.length} từ</strong> qua {sessionCards.length} câu hỏi và câu đố mẹo nhớ mặt chữ được đan xen ngẫu nhiên.
        </p>

        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl mb-6">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Số câu</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Đúng</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{correctCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Độ chính xác</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{accuracy}%</div>
          </div>
        </div>

        <button
          onClick={onFinishSession}
          className="w-full py-3 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
        >
          Trở về Dashboard & Cập nhật SRS
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentCardIndex + 1) / sessionCards.length) * 100);
  const currentRound = Math.floor(currentCardIndex / Math.max(1, sessionWords.length)) + 1;

  const modeLabels: Record<PracticeMode, string> = {
    mc_confused: '1. Chọn nghĩa',
    fill_blank: '2. Điền chỗ trống ví dụ',
    vi_to_hanzi: '3. Nghĩa Việt -> Chọn chữ Hán',
    hanzi_to_vi_type: '4. Chữ Hán -> Gõ nghĩa Việt',
    sentence_trans: '5. Tập dịch cả câu ví dụ',
    riddle: '🧩 Câu đố mẹo nhớ mặt chữ',
  };

  const knowledgeFullSentencePinyin = getSentencePinyin(currentWord.example || currentWord.hanzi, allWords);
  const currentMnemonic = getWordMnemonic(currentWord);

  return (
    <div className="max-w-xl mx-auto space-y-3.5">
      {/* Top Header & Session Progress Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">{sessionTitle}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium">
              Câu <strong>{currentCardIndex + 1}</strong>/{sessionCards.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoSoundEnabled(!autoSoundEnabled)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                autoSoundEnabled
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
                  : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
              }`}
              title={autoSoundEnabled ? 'Tự động phát âm sau khi làm câu (Đang BẬT)' : 'Tự động phát âm (Đang TẮT)'}
            >
              {autoSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{autoSoundEnabled ? 'Audio: Bật' : 'Audio: Tắt'}</span>
            </button>

            <button
              onClick={onFinishSession}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium text-xs cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            {currentMode === 'riddle' ? (
              <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Puzzle className="w-3 h-3 text-indigo-500" />
                Câu đố mẹo nhớ mặt chữ
              </span>
            ) : (
              <>
                <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Shuffle className="w-3 h-3 text-amber-500" />
                  Vòng {currentRound}/5: {modeLabels[currentMode]}
                </span>
                <span className="text-slate-400">
                  (Từ: <strong className="font-serif text-slate-800 dark:text-slate-200">{currentWord.hanzi}</strong>)
                </span>
              </>
            )}
          </div>
          <span>Tiến độ: {progressPercent}%</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xs transition-colors">
        <div className="text-center mb-5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            {currentQuestion.subText}
          </span>

          {/* Dạng Riddle: Câu đố mẹo nhớ mặt chữ */}
          {currentMode === 'riddle' ? (
            <div className="my-3 text-left bg-indigo-50/70 dark:bg-indigo-950/30 p-4.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/70 px-2 py-0.5 rounded flex items-center gap-1">
                  <Puzzle className="w-3 h-3 text-indigo-500" />
                  Câu đố chiết tự
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Đố bạn nhận diện mặt chữ!
                </span>
              </div>
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-sans">
                {currentQuestion.questionText}
              </div>
            </div>
          ) : currentMode === 'sentence_trans' ? (
            /* Dạng 5: Để nguyên cả câu ví dụ tiếng Trung để user tập dịch */
            <div className="my-3 text-left bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded">
                      Câu tiếng Trung
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Từ trọng tâm: <strong className="text-slate-900 dark:text-white font-serif">{currentWord.hanzi}</strong>
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {currentQuestion.questionText}
                  </div>
                </div>

                {isAnswered && (
                  <button
                    type="button"
                    onClick={() => audioService.speak(currentWord.example || currentWord.hanzi)}
                    className="p-2 rounded-xl bg-amber-100 dark:bg-slate-700 text-amber-800 dark:text-amber-300 transition-colors shrink-0 cursor-pointer animate-in fade-in"
                    title="Nghe phát âm cả câu"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Pinyin FULL CẢ CÂU: Luôn mờ */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                <button
                  type="button"
                  onClick={() => setIsQuestionPinyinRevealed(!isQuestionPinyinRevealed)}
                  className="w-full text-left inline-flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer select-none transition-all hover:border-amber-400 dark:hover:border-amber-500"
                  title="Pinyin cả câu luôn mờ. Bấm vào để xem/ẩn"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      Pinyin cả câu:
                    </span>
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 transition-all duration-200 leading-snug ${
                        isQuestionPinyinRevealed ? 'blur-none select-text' : 'blur-[5px] select-none'
                      }`}
                    >
                      {currentQuestion.fullQuestionPinyin}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 self-end sm:self-auto shrink-0 flex items-center gap-1 font-sans">
                    <Eye className="w-2.5 h-2.5" />
                    {isQuestionPinyinRevealed ? 'Ẩn pinyin' : 'Bấm để mở mờ'}
                  </span>
                </button>
              </div>
            </div>
          ) : currentQuestion.blankSentence ? (
            /* Dạng 2: Điền vào chỗ trống ví dụ */
            <div className="my-3">
              <div className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 leading-relaxed text-center sm:text-left">
                {currentQuestion.blankSentence}
              </div>

              <div className="mt-2.5 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsQuestionPinyinRevealed(!isQuestionPinyinRevealed)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all select-none"
                  title="Bấm vào để xem/ẩn Pinyin cả câu"
                >
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Pinyin cả câu:</span>
                  <span
                    className={`text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 font-mono transition-all duration-200 ${
                      isQuestionPinyinRevealed ? 'blur-none select-text' : 'blur-[5px] select-none'
                    }`}
                  >
                    {currentQuestion.fullQuestionPinyin}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 ml-1">
                    {isQuestionPinyinRevealed ? '(ẩn)' : '(bấm để mở mờ)'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Dạng 1, 3, 4: Chữ Hán hoặc Nghĩa */
            <div className="my-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-black font-serif text-slate-900 dark:text-white tracking-wider">
                  {currentQuestion.questionText}
                </span>

                {isAnswered && (
                  <button
                    onClick={() => audioService.speak(currentWord.hanzi)}
                    className="p-2 rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer animate-in fade-in"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsQuestionPinyinRevealed(!isQuestionPinyinRevealed)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all select-none"
                  title="Pinyin luôn mờ. Bấm vào để xem/ẩn"
                >
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Pinyin:</span>
                  <span
                    className={`text-sm font-bold text-amber-600 dark:text-amber-400 font-mono transition-all duration-200 ${
                      isQuestionPinyinRevealed ? 'blur-none select-text' : 'blur-[5px] select-none'
                    }`}
                  >
                    [{currentQuestion.fullQuestionPinyin}]
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {isQuestionPinyinRevealed ? '(ẩn)' : '(bấm để mở mờ)'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Practice Mode 5: Ô trống cho user tập dịch câu */}
        {currentMode === 'sentence_trans' ? (
          <form onSubmit={handleSubmitTyping} className="space-y-3 max-w-xl mx-auto">
            <div>
              <textarea
                ref={inputRef as any}
                rows={3}
                disabled={isAnswered}
                value={userTypedAnswer}
                onChange={(e) => setUserTypedAnswer(e.target.value)}
                placeholder="Nhập bản dịch tiếng Việt của bạn cho câu trên..."
                className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-70 text-xs sm:text-sm leading-relaxed"
              />
            </div>
            {!isAnswered ? (
              <button
                type="submit"
                disabled={!userTypedAnswer.trim()}
                className="w-full py-3 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 disabled:opacity-40 text-white dark:text-slate-950 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                Xác nhận bản dịch câu
              </button>
            ) : null}
          </form>
        ) : currentMode === 'hanzi_to_vi_type' ? (
          /* Practice Mode 4: Gõ nghĩa tiếng Việt */
          <form onSubmit={handleSubmitTyping} className="space-y-3 max-w-md mx-auto">
            <div>
              <input
                ref={inputRef as any}
                type="text"
                disabled={isAnswered}
                value={userTypedAnswer}
                onChange={(e) => setUserTypedAnswer(e.target.value)}
                placeholder="Nhập nghĩa tiếng Việt (vd: bạn bè, bác sĩ...)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-70 text-xs sm:text-sm"
              />
            </div>
            {!isAnswered ? (
              <button
                type="submit"
                disabled={!userTypedAnswer.trim()}
                className="w-full py-3 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 disabled:opacity-40 text-white dark:text-slate-950 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                Kiểm tra kết quả
              </button>
            ) : null}
          </form>
        ) : (
          /* Multiple Choice Options (Modes 1, 2, 3, Riddle) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === option.value;
              let btnClass = 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200';

              if (isAnswered) {
                if (option.isCorrect) {
                  btnClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold';
                } else if (isSelected && !option.isCorrect) {
                  btnClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300';
                } else {
                  btnClass = 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-50';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(option)}
                  className={`p-3.5 rounded-2xl border-2 text-left font-medium transition-all active:scale-98 flex items-center justify-between cursor-pointer ${btnClass}`}
                >
                  <span
                    className={`${
                      currentMode === 'vi_to_hanzi' || currentMode === 'fill_blank' || currentMode === 'riddle'
                        ? 'font-serif text-xl sm:text-2xl font-bold'
                        : 'text-xs sm:text-sm'
                    }`}
                  >
                    {option.label}
                  </span>
                  {isAnswered && option.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !option.isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* FEEDBACK SECTION NGAY TRÊN NÚT TIẾP TỤC */}
        {isAnswered && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 max-w-xl mx-auto space-y-3 animate-in fade-in">
            {/* Status kết quả nhỏ gọn */}
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <div className="flex items-center gap-1.5">
                {isCorrect ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {currentMode === 'riddle'
                      ? 'Tuyệt vời! Giải đúng câu đố mẹo!'
                      : currentMode === 'sentence_trans'
                      ? 'Đã hoàn thành lượt dịch câu!'
                      : 'Chính xác!'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <XCircle className="w-4 h-4" />
                    Chưa chính xác
                  </span>
                )}
              </div>

              {currentMode === 'sentence_trans' && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">Tự đánh giá:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCorrect(true);
                      onRecordResult(currentWord.id, true, currentMode);
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs font-medium ${
                      isCorrect
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Đúng ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCorrect(false);
                      onRecordResult(currentWord.id, false, currentMode);
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors text-xs font-medium ${
                      !isCorrect
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Sai ✗
                  </button>
                </div>
              )}
            </div>

            {/* KHUNG KIẾN THỨC / GIẢI NGHĨA CÂU ĐỐ MẸO */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
              {currentMode === 'riddle' ? (
                /* Khung giải thích riêng cho câu đố mẹo */
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Chữ Hán & Phiên âm:
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-serif font-black text-slate-900 dark:text-white">
                          {currentCard.riddle?.hanzi}
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                          [{currentCard.riddle?.pinyin}]
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          ({currentCard.riddle?.meaning})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioService.speak(currentCard.riddle?.hanzi || '')}
                      className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-slate-700 text-amber-800 dark:text-amber-300 transition-colors shrink-0 cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      Giải thích mẹo chiết tự:
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      {currentCard.riddle?.explanation}
                    </p>
                  </div>
                </>
              ) : (
                /* Khung kiến thức chuẩn cho các câu hỏi thường:
                   1. Câu ví dụ
                   2. Pinyin (mờ, bấm vào mới hiện)
                   3. Nghĩa
                   4. Mẹo nhớ mặt chữ
                */
                <>
                  {/* 1. Câu ví dụ */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Câu ví dụ:
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-serif text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                        {currentWord.example || `${currentWord.hanzi}。`}
                      </div>
                      <button
                        type="button"
                        onClick={() => audioService.speak(currentWord.example || currentWord.hanzi)}
                        className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-800 dark:text-amber-300 transition-colors shrink-0 cursor-pointer"
                        title="Nghe phát âm cả câu ví dụ"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Pinyin (Luôn bị làm mờ) */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Pinyin:
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setIsKnowledgePinyinRevealed(!isKnowledgePinyinRevealed)}
                        className="flex-1 text-left inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer select-none transition-all hover:border-amber-400 dark:hover:border-amber-500"
                        title="Pinyin bị mờ - Bấm để mở mờ / ẩn"
                      >
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 transition-all duration-200 leading-snug ${
                            isKnowledgePinyinRevealed ? 'blur-none select-text' : 'blur-[5px] select-none'
                          }`}
                        >
                          {knowledgeFullSentencePinyin || currentWord.pinyin}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-sans flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          {isKnowledgePinyinRevealed ? 'Ẩn' : 'Bấm để mở mờ'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => audioService.speak(currentWord.hanzi)}
                        className="p-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                        title="Nghe phát âm từ vựng"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 3. Nghĩa */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                      Nghĩa:
                    </span>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {currentWord.vietnamese}
                    </div>
                    {currentWord.exampleVi && currentWord.exampleVi !== currentWord.example && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                        Dịch câu: {currentWord.exampleVi}
                      </div>
                    )}
                  </div>

                  {/* 4. Mẹo nhớ mặt chữ (Chiết tự) */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      Mẹo nhớ mặt chữ:
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                      {currentMnemonic}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Nút Tiếp tục */}
            <button
              onClick={handleNextQuestion}
              className="w-full py-3 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Tiếp tục</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
