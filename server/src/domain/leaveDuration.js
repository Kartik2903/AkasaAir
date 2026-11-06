// Date-only handling: dates travel as 'YYYY-MM-DD' strings and are parsed as UTC midnight,
// so no local-timezone conversion can shift a day. Swap countDays() to change the counting method.
const DAY_MS = 86_400_000;

export function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}
export const formatDate = (d) => d.toISOString().slice(0, 10);
export const todayUtc = () => parseDate(new Date().toISOString().slice(0, 10));

// CALENDAR: inclusive calendar days (Nov 10 -> Nov 12 = 3). Only method implemented in Phase 1.
export function countDays(from, to, method = 'CALENDAR') {
  if (method !== 'CALENDAR') throw new Error(`Unsupported day counting method: ${method}`);
  return Math.round((to - from) / DAY_MS) + 1;
}
