import React, { useState } from 'react';
import { Word } from '../types';
import { parseAnkiOrCsvText } from '../services/ankiParser';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

interface AnkiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWords: (newWords: Word[]) => void;
  onRestoreDefault: () => void;
}

export const AnkiImportModal: React.FC<AnkiImportModalProps> = ({
  isOpen,
  onClose,
  onApplyWords,
  onRestoreDefault,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Word[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedPreview([]);
      setWarnings([]);
      return;
    }
    const res = parseAnkiOrCsvText(text);
    setParsedPreview(res.words);
    setWarnings(res.warnings);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (parsedPreview.length === 0) return;
    onApplyWords(parsedPreview);
    setSuccessMessage(`Đã nhập thành công ${parsedPreview.length} từ vào ứng dụng!`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Upload className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif">
                Nhập Dữ Liệu Anki / CSV
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hỗ trợ định dạng Tab (.txt), CSV (,), thẻ Mặt trước / Mặt sau
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {/* File Upload trigger */}
          <div className="flex items-center gap-2.5">
            <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-3.5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40">
              <input
                type="file"
                accept=".txt,.csv,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Tải lên file .txt hoặc .csv
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Tự động tách chữ Hán, Pinyin, bản dịch
              </div>
            </label>

            <button
              onClick={() => {
                onRestoreDefault();
                setSuccessMessage('Đã nạp lại bộ từ vựng chuẩn!');
                setTimeout(() => {
                  setSuccessMessage('');
                  onClose();
                }, 1000);
              }}
              className="px-3.5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Khôi phục lại dữ liệu mặc định"
            >
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px]">Khôi phục mặc định</span>
            </button>
          </div>

          {/* Paste Raw Textarea */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Hoặc dán nội dung Anki / CSV vào đây:
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Dán nội dung vào đây..."
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Preview */}
          {parsedPreview.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-amber-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-400 mb-2">
                <span>Phát hiện: {parsedPreview.length} từ</span>
                <span className="text-[10px] font-normal text-slate-500">
                  (Xem trước 3 từ đầu)
                </span>
              </div>

              <div className="space-y-1">
                {parsedPreview.slice(0, 3).map((w, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-slate-900 dark:text-white">{w.hanzi}</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">[{w.pinyin}]</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{w.vietnamese}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>Có {warnings.length} dòng không đúng định dạng và đã được bỏ qua.</div>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={parsedPreview.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Nhập {parsedPreview.length} từ
          </button>
        </div>
      </div>
    </div>
  );
};
