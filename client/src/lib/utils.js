import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));
export const formatDateTime = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n));
// <input type="datetime-local"> wants local time without a zone
export const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// 'YYYY-MM-DD' strings are date-only: build a local date from the parts so no timezone shifts the day.
const parts = (s) => s.split('-').map(Number);
export const dateFromIso = (s) => { const [y, m, d] = parts(s); return new Date(y, m - 1, d); };
export const formatDay = (s) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateFromIso(s));
export const formatRange = (from, to) => (from === to ? formatDay(from) : `${formatDay(from)} to ${formatDay(to)}`);
export const formatRelative = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return formatDateTime(iso);
};
export const toIsoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
