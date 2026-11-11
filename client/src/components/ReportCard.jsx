import { formatRange } from '../utils/dates.js';
import ValueBadge from './ValueBadge.jsx';

export default function ReportCard({ title, report, showReadings = false }) {
  const empty = report.count === 0;

  return (
    <section className="card report-card">
      <header className="report-header">
        <h2>{title}</h2>
        <span className="muted">{formatRange(report.from, report.to)}</span>
      </header>

      {empty ? (
        <p className="empty-state">No readings for this period yet. Add one on the Readings page.</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>Highest</dt>
              <dd>{report.highest}</dd>
            </div>
            <div>
              <dt>Lowest</dt>
              <dd>{report.lowest}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>{report.average.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Readings</dt>
              <dd>{report.count}</dd>
            </div>
          </dl>
          <p className="muted small">Values in mg/dl.</p>

          {showReadings && (
            <ul className="slot-list">
              {report.readings.map((r) => (
                <li key={r.id}>
                  <span>{r.slotLabel}</span>
                  <ValueBadge value={r.value} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
