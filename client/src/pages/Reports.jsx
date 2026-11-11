import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ReportCard from '../components/ReportCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { todayString } from '../utils/dates.js';

export default function Reports() {
  const [date, setDate] = useState(todayString());
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getReports(date)
      .then((data) => !cancelled && setReports(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="stack">
      <section className="card toolbar">
        <h1>Reports</h1>
        <label className="field inline">
          <span>Selected date</span>
          <input type="date" value={date} max={todayString()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {loading && !reports && <p className="muted">Loading…</p>}

      {reports && (
        <>
          <div className="report-grid">
            <ReportCard title="Daily" report={reports.daily} showReadings />
            <ReportCard title="Month to date" report={reports.monthToDate} />
            <ReportCard title="Previous month" report={reports.monthly} />
          </div>
          <section className="card">
            <h2>This month&apos;s trend</h2>
            <TrendChart trend={reports.monthToDate.trend} />
          </section>
        </>
      )}
    </div>
  );
}
