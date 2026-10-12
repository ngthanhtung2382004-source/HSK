import React, { useState, useEffect, useMemo } from 'react';
import { Word, WordProgress, PracticeMode } from './types';
import {
  loadStoredWords,
  saveStoredWords,
  loadStoredProgress,
  saveStoredProgress,
  resetAllProgress,
  exportBackupData,
} from './services/storageService';
import { computeDeckStats, recordWordPractice, getTodayString } from './services/srsEngine';
import { DEFAULT_HSK3_WORDS } from './data/hsk3Words';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { StudySession } from './components/StudySession';
import { WordLibrary } from './components/WordLibrary';
import { AnkiImportModal } from './components/AnkiImportModal';

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<number, WordProgress>>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library'>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hsk3_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Active study session state
  const [inSession, setInSession] = useState(false);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');

  // Initial load
  useEffect(() => {
    const loadedWords = loadStoredWords();
    const loadedProgress = loadStoredProgress(loadedWords);
    setWords(loadedWords);
    setProgress(loadedProgress);
  }, []);

  // Sync dark mode with document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('hsk3_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('hsk3_theme', 'light');
      }
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Compute stats
  const stats = useMemo(() => {
    return computeDeckStats(words.length, progress);
  }, [words, progress]);

  // Handle Practice Record
  const handleRecordResult = (wordId: number, isCorrect: boolean, mode: PracticeMode) => {
    const current = progress[wordId];
    if (!current) return;

    const updated = recordWordPractice(current, isCorrect, mode);
    setProgress((prev) => {
      const next = { ...prev, [wordId]: updated };
      saveStoredProgress(next);
      return next;
    });
  };

  // 1. Học từ mới (Mỗi session là 40 từ)
  const handleStartStudyNew = (batchSize: number = 40) => {
    const unexposed = words.filter((w) => !progress[w.id]?.exposed);
    const chosen = unexposed.slice(0, batchSize);

    if (chosen.length === 0) {
      alert('Bạn đã tiếp xúc với tất cả các từ trong danh sách! Hãy chuyển sang chế độ Ôn tập.');
      return;
    }

    setSessionWords(chosen);
    setSessionTitle(`Học từ mới (${chosen.length} từ)`);
    setInSession(true);
  };

  // 2. Ôn từ đã học (Ưu tiên từ đến hạn SRS + từ có vẻ đã quên, tối đa 40 từ)
  const handleStartReview = () => {
    const todayStr = getTodayString();
    
    // Prioritize forgotten words, then due words
    const forgottenWords = words.filter(
      (w) => progress[w.id]?.exposed && progress[w.id]?.isForgotten
    );

    const dueWords = words.filter(
      (w) =>
        progress[w.id]?.exposed &&
        !progress[w.id]?.isForgotten &&
        (progress[w.id]?.nextReviewDate || '') <= todayStr
    );

    const otherExposed = words.filter(
      (w) => progress[w.id]?.exposed && !forgottenWords.includes(w) && !dueWords.includes(w)
    );

    const pool = [...forgottenWords, ...dueWords, ...otherExposed].slice(0, 40);

    if (pool.length === 0) {
      alert('Hiện chưa có từ nào đã học để ôn tập. Hãy bắt đầu bằng cách Học từ mới!');
      return;
    }

    setSessionWords(pool);
    setSessionTitle(`Ôn tập Spaced Repetition (${pool.length} từ)`);
    setInSession(true);
  };

  // Chế độ ôn cấp tốc riêng cho các từ có vẻ đã quên
  const handleStartForgottenReview = () => {
    const forgotten = words
      .filter((w) => progress[w.id]?.exposed && progress[w.id]?.isForgotten)
      .slice(0, 40);

    if (forgotten.length === 0) {
      alert('Tuyệt vời! Hiện không có từ nào bị đánh dấu đã quên.');
      return;
    }

    setSessionWords(forgotten);
    setSessionTitle(`Ôn tập từ có vẻ đã quên (${forgotten.length} từ)`);
    setInSession(true);
  };

  // Reset Progress
  const handleResetProgress = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn đặt lại toàn bộ tiến độ học (SRS, từ đã thuộc, từ đã quên)? Dữ liệu từ vựng vẫn được giữ nguyên.'
      )
    ) {
      const fresh = resetAllProgress(words);
      setProgress(fresh);
    }
  };

  // Export Backup
  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk3-srs-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply imported words
  const handleApplyWords = (newWords: Word[]) => {
    setWords(newWords);
    saveStoredWords(newWords);
    const newProgress = loadStoredProgress(newWords);
    setProgress(newProgress);
  };

  // Restore Default 600 words
  const handleRestoreDefault = () => {
    setWords(DEFAULT_HSK3_WORDS);
    saveStoredWords(DEFAULT_HSK3_WORDS);
    const newProgress = loadStoredProgress(DEFAULT_HSK3_WORDS);
    setProgress(newProgress);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navigation */}
      <Navbar
        currentTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setInSession(false);
        }}
        onOpenImport={() => setIsImportModalOpen(true)}
        onResetProgress={handleResetProgress}
        onExportBackup={handleExportBackup}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {inSession ? (
          <StudySession
            sessionWords={sessionWords}
            allWords={words}
            progressMap={progress}
            sessionTitle={sessionTitle}
            onRecordResult={handleRecordResult}
            onFinishSession={() => setInSession(false)}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            stats={stats}
            words={words}
            progress={progress}
            onStartStudyNew={handleStartStudyNew}
            onStartReview={handleStartReview}
            onStartForgottenReview={handleStartForgottenReview}
            onViewLibrary={() => setActiveTab('library')}
          />
        ) : (
          <WordLibrary
            words={words}
            progress={progress}
            onStartCustomStudy={(selectedIds) => {
              const selected = words.filter((w) => selectedIds.includes(w.id));
              if (selected.length > 0) {
                setSessionWords(selected.slice(0, 40));
                setSessionTitle(`Luyện tập (${selected.length} từ)`);
                setInSession(true);
              }
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        HSK 3 Hanzi Master • Spaced Repetition SRS • Audio phát âm chuẩn
      </footer>

      {/* Import Modal */}
      <AnkiImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyWords={handleApplyWords}
        onRestoreDefault={handleRestoreDefault}
      />
    </div>
  );
}
