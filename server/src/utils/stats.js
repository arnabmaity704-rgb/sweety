const round1 = (n) => Math.round(n * 10) / 10;

/** Highest, lowest, average (rounded to 1 decimal) and count for a list of values. */
function summarize(values) {
  if (!values.length) {
    return { count: 0, highest: null, lowest: null, average: null };
  }
  const total = values.reduce((sum, v) => sum + v, 0);
  return {
    count: values.length,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: round1(total / values.length),
  };
}

module.exports = { summarize, round1 };
