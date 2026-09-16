// frontend/src/components/TimeEntries/WeeklySummary.jsx
// Simple day-by-day list of hours for the current week (Mon → Sun).

import { Calendar } from 'lucide-react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeeklySummary = ({ entries }) => {
  // Build the current week's Mon–Sun dates as ISO date strings.
  const week = getWeekDates();
  const totals = {};
  for (const date of week) totals[date] = 0;

  // Sum hours per day from entries.
  for (const e of entries || []) {
    const d = toDateOnly(e.entryDate);
    if (d in totals) totals[d] += Number(e.hours) || 0;
  }

  const weekTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const maxHours = Math.max(...Object.values(totals), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600 dark:text-gold-400" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            This Week
          </h2>
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {formatHours(weekTotal)} total
        </span>
      </div>

      <div className="space-y-2">
        {week.map((date, i) => {
          const hours = totals[date];
          const pct = (hours / maxHours) * 100;
          const isToday = date === toDateOnly(new Date());

          return (
            <div key={date} className="flex items-center gap-3">
              <div
                className={`w-10 text-xs font-medium ${
                  isToday
                    ? 'text-primary-600 dark:text-gold-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {DAY_LABELS[i]}
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    hours > 0
                      ? 'bg-primary-500 dark:bg-gold-500'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-16 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                {formatHours(hours)}
              </div>
            </div>
          );
        })}
      </div>

      {weekTotal === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
          No hours logged this week yet.
        </p>
      )}
    </div>
  );
};

// ── helpers ──
function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toDateOnly(d));
  }
  return dates;
}

function toDateOnly(input) {
  if (!input) return '';
  if (typeof input === 'string') return input.slice(0, 10);
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatHours(n) {
  const v = Number(n) || 0;
  return `${v % 1 === 0 ? v : v.toFixed(2).replace(/\.?0+$/, '')}h`;
}

export default WeeklySummary;