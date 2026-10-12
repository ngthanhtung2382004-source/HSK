import React, { useState } from 'react';
import { audioService } from '../services/audioService';
import { BookOpen, Library, Upload, Volume2, RotateCcw, Download, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'library';
  onChangeTab: (tab: 'dashboard' | 'library') => void;
  onOpenImport: () => void;
  onResetProgress: () => void;
  onExportBackup: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onChangeTab,
  onOpenImport,
  onResetProgress,
  onExportBackup,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [speechRate, setSpeechRate] = useState(0.85);

  const handleCycleSpeed = () => {
    let nextRate = 0.85;
    if (speechRate === 0.85) nextRate = 1.0;
    else if (speechRate === 1.0) nextRate = 0.7;
    else nextRate = 0.85;

    setSpeechRate(nextRate);
    audioService.rate = nextRate;
    audioService.speak('中文发音测试', nextRate);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => onChangeTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-serif font-black text-lg shadow-2xs group-hover:scale-105 transition-transform">
            汉
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base font-serif">
                HSK 3 SRS
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded">
                600
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
              Nhớ mặt chữ & phản xạ đọc
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
          <button
            onClick={() => onChangeTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Học & SRS</span>
          </button>

          <button
            onClick={() => onChangeTab('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'library'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Thư viện</span>
          </button>
        </nav>

        {/* Right Tools: Dark Mode + Speed + Import + Options */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối (Dark mode)'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Audio Speed */}
          <button
            onClick={handleCycleSpeed}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Đổi tốc độ phát âm (0.7x, 0.85x, 1.0x)"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{speechRate}x</span>
          </button>

          {/* Import Anki/CSV */}
          <button
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nhập Anki/CSV</span>
          </button>

          {/* Export Backup */}
          <button
            onClick={onExportBackup}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sao lưu tiến độ"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset Progress */}
          <button
            onClick={onResetProgress}
            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Đặt lại tiến độ"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
