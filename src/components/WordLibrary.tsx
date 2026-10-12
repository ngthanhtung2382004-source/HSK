import React, { useState, useMemo } from 'react';
import { Word, WordProgress } from '../types';
import { audioService } from '../services/audioService';
import { getWordMnemonic } from '../data/hsk3Mnemonics';
import { Search, Volume2, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface WordLibraryProps {
  words: Word[];
  progress: Record<number, WordProgress>;
  onStartCustomStudy?: (selectedWordIds: number[]) => void;
}

export const WordLibrary: React.FC<WordLibraryProps> = ({ words, progress }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unseen' | 'learning' | 'mastered' | 'forgotten'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [blurPinyin, setBlurPinyin] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});

  const toggleRevealWord = (id: number) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const p = progress[w.id];
      if (selectedFilter === 'unseen' && p?.exposed) return false;
      if (selectedFilter === 'learning' && (!p?.exposed || p?.isMastered)) return false;
      if (selectedFilter === 'mastered' && !p?.isMastered) return false;
      if (selectedFilter === 'forgotten' && (!p?.exposed || !p?.isForgotten)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchHanzi = w.hanzi.includes(q);
        const matchPinyin = w.pinyin.toLowerCase().includes(q);
        const matchVi = w.vietnamese.toLowerCase().includes(q);
        return matchHanzi || matchPinyin || matchVi;
      }

      return true;
    });
  }, [words, progress, selectedFilter, searchQuery]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-serif">
              Thư Viện Từ Vựng ({words.length} từ)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tra cứu chữ Hán, phiên âm, nghĩa tiếng Việt và câu ví dụ
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chữ Hán, pinyin hoặc nghĩa..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedFilter === 'all'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tất cả ({words.length})
          </button>
          <button
            onClick={() => setSelectedFilter('unseen')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedFilter === 'unseen'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
            }`}
          >
            Chưa học ({words.filter((w) => !progress[w.id]?.exposed).length})
          </button>
          <button
            onClick={() => setSelectedFilter('learning')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedFilter === 'learning'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            Đang học ({words.filter((w) => progress[w.id]?.exposed && !progress[w.id]?.isMastered).length})
          </button>
          <button
            onClick={() => setSelectedFilter('mastered')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedFilter === 'mastered'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            Đã thuộc ({words.filter((w) => progress[w.id]?.isMastered).length})
          </button>
          <button
            onClick={() => setSelectedFilter('forgotten')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              selectedFilter === 'forgotten'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            Có vẻ đã quên ({words.filter((w) => progress[w.id]?.exposed && progress[w.id]?.isForgotten).length})
          </button>

          <button
            onClick={() => setBlurPinyin(!blurPinyin)}
            className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
              blurPinyin
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Làm mờ Pinyin để tự luyện nhớ mặt chữ Hán, bấm vào từ để xem"
          >
            {blurPinyin ? '👁 Đang làm mờ Pinyin' : 'Làm mờ Pinyin'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredWords.map((word) => {
          const p = progress[word.id];
          const isExpanded = expandedId === word.id;

          let statusBadge = (
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Chưa học
            </span>
          );

          if (p?.isForgotten) {
            statusBadge = (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Đã quên
              </span>
            );
          } else if (p?.isMastered) {
            statusBadge = (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Đã thuộc
              </span>
            );
          } else if (p?.exposed) {
            statusBadge = (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                Tầng {p.stage}
              </span>
            );
          }

          return (
            <div
              key={word.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs hover:border-amber-300 dark:hover:border-amber-500 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                      {word.hanzi}
                    </span>
                    <span
                      onClick={() => toggleRevealWord(word.id)}
                      className={`text-xs font-semibold text-amber-600 dark:text-amber-400 font-mono transition-all duration-200 cursor-pointer ${
                        blurPinyin && !revealedIds[word.id]
                          ? 'blur-[5px] select-none hover:blur-[3px]'
                          : 'blur-none'
                      }`}
                      title={blurPinyin ? 'Bấm để xem Pinyin' : undefined}
                    >
                      {word.pinyin}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => audioService.speak(word.hanzi)}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {statusBadge}
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                  {word.vietnamese}
                </p>

                {/* Mẹo nhớ mặt chữ (Chiết tự) */}
                <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 p-2 rounded-xl flex items-start gap-1.5 leading-snug">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold mr-1">Mẹo nhớ:</span>
                    <span>{getWordMnemonic(word)}</span>
                  </div>
                </div>

                {isExpanded && word.example && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <div className="font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{word.example}</span>
                      <button
                        onClick={() => audioService.speak(word.example)}
                        className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 ml-2"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                    {word.exampleVi && (
                      <div className="text-slate-500 dark:text-slate-400 italic">{word.exampleVi}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>#{word.id}</span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : word.id)}
                  className="text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                >
                  {isExpanded ? 'Thu gọn' : 'Xem ví dụ'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
