const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

/** Today's date as 'YYYY-MM-DD' in the browser's timezone. */
export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** '2026-10-15' -> '15 Oct 2026' */
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ('2026-10-01', '2026-10-15') -> '1 Oct – 15 Oct 2026' */
export function formatRange(from, to) {
  if (from === to) return formatDate(from);
  const [fy] = from.split('-');
  const [ty] = to.split('-');
  const start = formatDate(from);
  return `${fy === ty ? start.slice(0, -5) : start} – ${formatDate(to)}`;
}

/** '2026-10-15' -> '15 Oct' (used for chart axes) */
export function formatShort(dateStr) {
  return formatDate(dateStr).slice(0, -5);
}
