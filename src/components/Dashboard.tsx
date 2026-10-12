import React from 'react';
import { DeckStatistics, Word, WordProgress } from '../types';
import { SrsChart } from './SrsChart';
import { BookOpen, RotateCcw, AlertTriangle, CheckCircle2, Eye, Sparkles, Volume2 } from 'lucide-react';
import { audioService } from '../services/audioService';

interface DashboardProps {
  stats: DeckStatistics;
  words: Word[];
  progress: Record<number, WordProgress>;
  onStartStudyNew: (batchSize?: number) => void;
  onStartReview: () => void;
  onStartForgottenReview: () => void;
  onViewLibrary: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  words,
  progress,
  onStartStudyNew,
  onStartReview,
  onStartForgottenReview,
  onViewLibrary,
}) => {
  const unexposedCount = Math.max(0, stats.totalWords - stats.exposedCount);
  const forgottenRatio =
    stats.exposedCount > 0 ? `${stats.forgottenCount}/${stats.exposedCount}` : '0/0';
  const forgottenPercentage =
    stats.exposedCount > 0 ? Math.round((stats.forgottenCount / stats.exposedCount) * 100) : 0;
  const masteredPercentage =
    stats.totalWords > 0 ? Math.round((stats.masteredCount / stats.totalWords) * 100) : 0;
  const exposedPercentage =
    stats.totalWords > 0 ? Math.round((stats.exposedCount / stats.totalWords) * 100) : 0;

  const problematicWords = words
    .filter((w) => progress[w.id]?.exposed && progress[w.id]?.isForgotten)
    .slice(0, 6);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Hero Welcome banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none select-none flex items-center pr-6">
          <span className="font-serif text-9xl tracking-widest font-black text-amber-300">汉字</span>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold mb-2.5 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            Luyện Nhớ Mặt Chữ & Phản Xạ Đọc HSK 3
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-2 font-serif">
            Học tập theo chu kỳ Spaced Repetition (SRS)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Tập trung ghi nhớ chữ Hán không phụ thuộc Pinyin. Mỗi session gồm 40 từ với 5 dạng bài tập luyện nhớ sâu.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <button
              onClick={() => onStartStudyNew(40)}
              disabled={unexposedCount === 0}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer ${
                unexposedCount > 0
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              1. Học từ mới (40 từ)
              {unexposedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/10 text-xs font-black">
                  còn {unexposedCount}
                </span>
              )}
            </button>

            <button
              onClick={onStartReview}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 cursor-pointer ${
                stats.readyToReviewCount > 0
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-rose-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              2. Ôn từ đã học ({stats.readyToReviewCount} từ đến hạn)
            </button>

            {stats.forgottenCount > 0 && (
              <button
                onClick={onStartForgottenReview}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Ôn {stats.forgottenCount} từ có vẻ đã quên
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 Core Required Metrics Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Metric 1: Tiếp xúc */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              1. Số từ đã tiếp xúc
            </span>
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-serif">
              {stats.exposedCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {stats.totalWords} từ
            </span>
            <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
              {exposedPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${exposedPercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Đã thuộc */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              2. Số từ đã thuộc
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-serif">
              {stats.masteredCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {stats.totalWords} từ
            </span>
            <span className="ml-auto text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              {masteredPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${masteredPercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Có vẻ đã quên */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              3. Số từ có vẻ đã quên
            </span>
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-serif">
              {stats.forgottenCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {stats.exposedCount} đã tiếp xúc
            </span>
            <span className="ml-auto text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
              {forgottenPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${forgottenPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7-Day Spaced Repetition Forecast Bar Chart */}
      <SrsChart forecast={stats.forecast7Days} onStartReview={onStartReview} />

      {/* Forgotten words tray */}
      {problematicWords.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-slate-800/50 border border-amber-200/80 dark:border-slate-700 rounded-2xl p-4.5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Các từ sai &ge; 2 lần cần ôn lại gấp:
            </div>
            <button
              onClick={onStartForgottenReview}
              className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Ôn ngay
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {problematicWords.map((w) => (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-amber-200 dark:border-slate-700 text-center shadow-2xs"
              >
                <div className="text-lg font-bold font-serif text-slate-900 dark:text-white">{w.hanzi}</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">{w.pinyin}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={w.vietnamese}>
                  {w.vietnamese}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom shortcut */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <span>Kho từ vựng: {stats.totalWords} từ</span>
        <button
          onClick={onViewLibrary}
          className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
        >
          Xem toàn bộ thư viện &rarr;
        </button>
      </div>
    </div>
  );
};
