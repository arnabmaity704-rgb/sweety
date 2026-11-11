import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ReadingForm from '../components/ReadingForm.jsx';
import ValueBadge from '../components/ValueBadge.jsx';
import { formatDate } from '../utils/dates.js';

const PAGE_SIZE = 10;

export default function Readings() {
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listReadings({ page, limit: PAGE_SIZE });
      // If the last item on a page was deleted, step back a page.
      if (res.data.length === 0 && page > 1) return setPage(page - 1);
      setReadings(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  async function handleCreate(data) {
    setNotice('');
    await api.createReading(data);
    flash('Reading added.');
    await load();
  }

  async function handleUpdate(data) {
    setNotice('');
    await api.updateReading(editing.id, data);
    setEditing(null);
    flash('Reading updated.');
    await load();
  }

  async function handleDelete(reading) {
    if (!window.confirm(`Delete the ${reading.slotLabel} reading on ${formatDate(reading.date)}?`)) return;
    try {
      await api.deleteReading(reading.id);
      if (editing?.id === reading.id) setEditing(null);
      flash('Reading deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      {editing ? (
        <ReadingForm key={editing.id} initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
      ) : (
        <ReadingForm key="new" onSubmit={handleCreate} />
      )}

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <section className="card">
        <h2>Your readings</h2>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : readings.length === 0 ? (
          <p className="empty-state">No readings yet. Add your first one above.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Value</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r.id} className={editing?.id === r.id ? 'row-active' : undefined}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.slotLabel}</td>
                      <td>
                        <ValueBadge value={r.value} />
                      </td>
                      <td className="actions">
                        <button type="button" className="btn btn-small" onClick={() => setEditing(r)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(r)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button type="button" className="btn btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Previous
              </button>
              <span className="muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} readings
              </span>
              <button
                type="button"
                className="btn btn-small"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
