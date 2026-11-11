import { MAX_VALUE, MIN_VALUE, SLOT_LABELS } from './constants.js';
import { todayString } from './dates.js';

/**
 * Client-side checks that mirror the API rules, so users get instant feedback.
 * The server validates everything again (including per-day limits).
 */
export function validateReadingForm({ date, slot, value }, today = todayString()) {
  const errors = {};

  if (!date) errors.date = 'Please select a date.';
  else if (date > today) errors.date = 'Date cannot be in the future.';

  if (!SLOT_LABELS[slot]) errors.slot = 'Please choose a time slot.';

  const text = String(value ?? '').trim();
  if (text === '') errors.value = 'Please enter a glucose value.';
  else if (!/^-?\d+$/.test(text)) errors.value = `Value must be a whole number between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;
  else if (Number(text) < MIN_VALUE || Number(text) > MAX_VALUE)
    errors.value = `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;

  return errors;
}
