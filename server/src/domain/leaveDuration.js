// Date-only handling: dates travel as 'YYYY-MM-DD' strings and are parsed as UTC midnight,
// so no local-timezone conversion can shift a day. countDays() holds the counting rule.
const DAY_MS = 86_400_000;

export function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}
export const formatDate = (d) => d.toISOString().slice(0, 10);
export const todayUtc = () => parseDate(new Date().toISOString().slice(0, 10));

// WORKING_DAYS: inclusive, Saturdays and Sundays do not count. CALENDAR: every day counts.
export function countDays(from, to, method = 'WORKING_DAYS') {
  if (method === 'CALENDAR') return Math.round((to - from) / DAY_MS) + 1;
  if (method !== 'WORKING_DAYS') throw new Error(`Unsupported day counting method: ${method}`);
  let days = 0;
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}
