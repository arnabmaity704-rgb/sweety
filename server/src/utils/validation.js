const { SLOT_KEYS, MIN_VALUE, MAX_VALUE, MESSAGES } = require('../constants');
const { isValidDateString, todayString } = require('./dates');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/** Returns an error message, or null when the glucose value is valid. */
function validateValue(value) {
  if (isBlank(value)) return MESSAGES.valueRequired;

  let num;
  if (typeof value === 'number') num = value;
  else if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) num = Number(value);
  else return MESSAGES.valueNotWhole;

  if (!Number.isInteger(num)) return MESSAGES.valueNotWhole;
  if (num < MIN_VALUE || num > MAX_VALUE) return MESSAGES.valueOutOfRange;
  return null;
}

function validateDate(date, today = todayString()) {
  if (isBlank(date)) return MESSAGES.dateRequired;
  if (!isValidDateString(date)) return MESSAGES.dateInvalid;
  if (date > today) return MESSAGES.dateInFuture; // safe: YYYY-MM-DD strings sort chronologically
  return null;
}

function validateSlot(slot) {
  return SLOT_KEYS.includes(slot) ? null : MESSAGES.slotInvalid;
}

/** Validates a reading payload. Returns { errors, data }; errors is null when valid. */
function validateReading(input = {}, today = todayString()) {
  const errors = {};
  const dateError = validateDate(input.date, today);
  const slotError = validateSlot(input.slot);
  const valueError = validateValue(input.value);
  if (dateError) errors.date = dateError;
  if (slotError) errors.slot = slotError;
  if (valueError) errors.value = valueError;

  if (Object.keys(errors).length) return { errors, data: null };
  return { errors: null, data: { date: input.date, slot: input.slot, value: Number(input.value) } };
}

function validateRegistration({ name, email, password } = {}) {
  const errors = {};
  if (isBlank(name)) errors.name = 'Please enter your name.';
  else if (String(name).trim().length > 100) errors.name = 'Name must be at most 100 characters.';
  if (isBlank(email)) errors.email = 'Please enter your email.';
  else if (!EMAIL_RE.test(String(email).trim())) errors.email = 'Please enter a valid email address.';
  if (isBlank(password)) errors.password = 'Please enter a password.';
  else if (String(password).length < 6) errors.password = 'Password must be at least 6 characters.';
  return Object.keys(errors).length ? errors : null;
}

function validateLogin({ email, password } = {}) {
  const errors = {};
  if (isBlank(email)) errors.email = 'Please enter your email.';
  if (isBlank(password)) errors.password = 'Please enter your password.';
  return Object.keys(errors).length ? errors : null;
}

module.exports = {
  validateValue,
  validateDate,
  validateSlot,
  validateReading,
  validateRegistration,
  validateLogin,
};
