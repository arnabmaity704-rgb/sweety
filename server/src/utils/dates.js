// All dates are handled as 'YYYY-MM-DD' strings to avoid timezone surprises.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n) => String(n).padStart(2, '0');

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today's date in the server's local timezone (set the TZ env variable to change it). */
function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Converts a DB date value (string or Date) into 'YYYY-MM-DD'. */
function normalizeDate(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

/** Number of days in a month (month is 1-based). */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Date ranges for the three reports, relative to the selected date.
 *   daily:        the selected date
 *   monthToDate:  1st of the selected month -> selected date
 *   monthly:      the whole previous month
 */
function getReportRanges(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;

  return {
    daily: { from: dateStr, to: dateStr },
    monthToDate: { from: `${y}-${pad(m)}-01`, to: dateStr },
    monthly: {
      from: `${prevYear}-${pad(prevMonth)}-01`,
      to: `${prevYear}-${pad(prevMonth)}-${pad(daysInMonth(prevYear, prevMonth))}`,
    },
  };
}

module.exports = { isValidDateString, todayString, normalizeDate, getReportRanges };
