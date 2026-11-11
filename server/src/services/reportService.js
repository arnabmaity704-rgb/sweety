const db = require('../db');
const { validationError } = require('../utils/errors');
const { validateDate } = require('../utils/validation');
const { getReportRanges } = require('../utils/dates');
const { summarize, round1 } = require('../utils/stats');
const { toReading, SLOT_ORDER_SQL, COLUMNS } = require('./readingService');

function buildReport(readings, { from, to }) {
  const inRange = readings.filter((r) => r.date >= from && r.date <= to);
  return { from, to, ...summarize(inRange.map((r) => r.value)), readings: inRange };
}

/** One point per day that has readings: used for the month-to-date line chart. */
function dailyTrend(readings) {
  const byDate = new Map();
  for (const r of readings) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r.value);
  }
  return [...byDate.entries()].map(([date, values]) => ({
    date,
    average: round1(values.reduce((a, b) => a + b, 0) / values.length),
    highest: Math.max(...values),
    lowest: Math.min(...values),
  }));
}

/**
 * Daily, month-to-date and previous-month reports for the selected date.
 * Loads everything from the 1st of the previous month up to the selected date in one query.
 */
async function getReports(userId, date) {
  const error = validateDate(date);
  if (error) throw validationError({ date: error });

  const ranges = getReportRanges(date);
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
     ORDER BY reading_date, ${SLOT_ORDER_SQL}`,
    [userId, ranges.monthly.from, date]
  );
  const readings = rows.map(toReading);

  const daily = buildReport(readings, ranges.daily);
  const { readings: mtdReadings, ...monthToDate } = buildReport(readings, ranges.monthToDate);
  const { readings: _unused, ...monthly } = buildReport(readings, ranges.monthly);

  return {
    date,
    daily,
    monthToDate: { ...monthToDate, trend: dailyTrend(mtdReadings) },
    monthly,
  };
}

module.exports = { getReports };
