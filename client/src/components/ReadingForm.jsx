import { useState } from 'react';
import { MAX_VALUE, MIN_VALUE, SLOTS } from '../utils/constants.js';
import { todayString } from '../utils/dates.js';
import { validateReadingForm } from '../utils/validation.js';

/**
 * Add / edit form for a reading.
 * `onSubmit(data)` should return a promise; if it throws an ApiError, its
 * message (and per-field messages) are shown in the form.
 */
export default function ReadingForm({ initial, onSubmit, onCancel }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    date: initial?.date ?? todayString(),
    slot: initial?.slot ?? SLOTS[0].key,
    value: initial?.value ?? '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validateReadingForm(form);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      await onSubmit({ date: form.date, slot: form.slot, value: Number(form.value) });
      if (!isEdit) setForm((f) => ({ ...f, value: '' }));
    } catch (err) {
      // Per-day rules (duplicate slot, 4 per day) are only known by the server.
      setFormError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card reading-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEdit ? 'Edit reading' : 'Add a reading'}</h2>

      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="form-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={form.date} max={todayString()} onChange={update('date')} />
          {errors.date && <small className="field-error">{errors.date}</small>}
        </label>

        <label className="field">
          <span>Time slot</span>
          <select value={form.slot} onChange={update('slot')}>
            {SLOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {errors.slot && formError !== errors.slot && <small className="field-error">{errors.slot}</small>}
        </label>

        <label className="field">
          <span>Value (mg/dl)</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_VALUE}
            max={MAX_VALUE}
            step="1"
            placeholder="e.g. 110"
            value={form.value}
            onChange={update('value')}
          />
          {errors.value && <small className="field-error">{errors.value}</small>}
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add reading'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
