import React from 'react';
import { DayForecast } from '../types';
import { Calendar, Flame, AlertCircle } from 'lucide-react';

interface SrsChartProps {
  forecast: DayForecast[];
  onStartReview?: () => void;
}

export const SrsChart: React.FC<SrsChartProps> = ({ forecast, onStartReview }) => {
  const maxCount = Math.max(1, ...forecast.map((d) => d.dueCount));
  const todayDue = forecast[0]?.dueCount || 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Lịch Ôn Tập Spaced Repetition (7 Ngày)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lượng từ cần ôn theo chu kỳ ngắt quãng (Cột 1 luôn là Hôm nay)
              </p>
            </div>
          </div>
        </div>

        {todayDue > 0 && onStartReview && (
          <button
            onClick={onStartReview}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            Ôn ngay hôm nay ({todayDue} từ)
          </button>
        )}
      </div>

      {/* Vertical Bar Chart */}
      <div className="pt-6 pb-2 px-1 sm:px-4">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-slate-200 dark:border-slate-800">
          {forecast.map((item, index) => {
            const heightPercent = Math.max(8, Math.round((item.dueCount / maxCount) * 100));
            const isToday = item.isToday;

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-end h-full group relative"
              >
                {/* Count label */}
                <div
                  className={`text-[11px] font-bold mb-1.5 transition-transform duration-200 group-hover:-translate-y-1 ${
                    isToday
                      ? 'text-rose-600 dark:text-rose-400'
                      : item.dueCount > 0
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                >
                  {item.dueCount}
                </div>

                {/* Vertical Bar */}
                <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800/80 rounded-t-xl overflow-hidden flex items-end h-full">
                  <div
                    style={{ height: `${item.dueCount === 0 ? 4 : heightPercent}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 ${
                      isToday
                        ? item.dueCount > 0
                          ? 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-xs'
                          : 'bg-emerald-500'
                        : item.dueCount > 0
                        ? 'bg-gradient-to-t from-indigo-500 to-blue-400 opacity-80 group-hover:opacity-100'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute -top-9 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[11px] font-medium py-1 px-2 rounded-lg whitespace-nowrap shadow-lg z-20">
                  {item.label}: {item.dueCount} từ
                </div>
              </div>
            );
          })}
        </div>

        {/* X Axis Labels */}
        <div className="grid grid-cols-7 gap-1 sm:gap-4 mt-2.5 text-center">
          {forecast.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <span
                className={`text-[10px] sm:text-xs font-semibold ${
                  item.isToday
                    ? 'text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 rounded border border-rose-200 dark:border-rose-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                {item.isToday ? 'Today' : `+${item.dayOffset}d`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Hôm nay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Các ngày tới</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <AlertCircle className="w-3 h-3" />
          <span>Hệ thống SRS tự dãn ngày khi làm đúng</span>
        </div>
      </div>
    </div>
  );
};
