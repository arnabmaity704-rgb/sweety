const { getReportRanges } = require('../src/utils/dates');
const { summarize } = require('../src/utils/stats');

describe('getReportRanges', () => {
  test('matches the example in the brief (15 Oct 2026)', () => {
    expect(getReportRanges('2026-10-15')).toEqual({
      daily: { from: '2026-10-15', to: '2026-10-15' },
      monthToDate: { from: '2026-10-01', to: '2026-10-15' },
      monthly: { from: '2026-09-01', to: '2026-09-30' },
    });
  });

  test('January reports on December of the previous year', () => {
    expect(getReportRanges('2027-01-10').monthly).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  test('handles February in leap and non-leap years', () => {
    expect(getReportRanges('2028-03-05').monthly.to).toBe('2028-02-29');
    expect(getReportRanges('2027-03-05').monthly.to).toBe('2027-02-28');
  });
});

describe('summarize', () => {
  test('returns highest, lowest, count and average rounded to 1 decimal', () => {
    expect(summarize([100, 120, 131])).toEqual({ count: 3, highest: 131, lowest: 100, average: 117 });
    expect(summarize([100, 101, 101])).toEqual({ count: 3, highest: 101, lowest: 100, average: 100.7 });
  });

  test('returns an empty summary when there are no readings', () => {
    expect(summarize([])).toEqual({ count: 0, highest: null, lowest: null, average: null });
  });
});
