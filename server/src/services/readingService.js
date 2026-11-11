const db = require('../db');
const { SLOT_LABELS, MAX_READINGS_PER_DAY, MESSAGES } = require('../constants');
const { AppError, validationError } = require('../utils/errors');
const { validateReading, validateDate } = require('../utils/validation');
const { normalizeDate } = require('../utils/dates');

const UNIQUE_VIOLATION = '23505';

// Sorts slots in the order of the day rather than alphabetically.
const SLOT_ORDER_SQL = `CASE slot
  WHEN 'morning_fasting' THEN 1
  WHEN 'after_breakfast' THEN 2
  WHEN 'after_lunch' THEN 3
  ELSE 4 END`;

const COLUMNS = 'id, reading_date, slot, value, created_at, updated_at';

function toReading(row) {
  return {
    id: row.id,
    date: normalizeDate(row.reading_date),
    slot: row.slot,
    slotLabel: SLOT_LABELS[row.slot],
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function notFound() {
  return new AppError(404, 'Reading not found.');
}

function parseId(id) {
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) throw notFound();
  return num;
}

/**
 * Enforces the per-day rules: max 4 readings, one per slot.
 * `excludeId` skips the reading being edited so it doesn't conflict with itself.
 */
async function assertDayRules(userId, { date, slot }, excludeId = null) {
  const { rows } = await db.query('SELECT id, slot FROM readings WHERE user_id = $1 AND reading_date = $2', [
    userId,
    date,
  ]);
  const others = rows.filter((r) => r.id !== excludeId);

  if (others.length >= MAX_READINGS_PER_DAY) {
    throw new AppError(409, MESSAGES.maxPerDay, { slot: MESSAGES.maxPerDay });
  }
  if (others.some((r) => r.slot === slot)) {
    const message = MESSAGES.duplicateSlot(SLOT_LABELS[slot]);
    throw new AppError(409, message, { slot: message });
  }
}

/** The DB unique constraint is the final safety net if two requests race past assertDayRules. */
function translateDbError(err, slot) {
  if (err.code === UNIQUE_VIOLATION) {
    const message = MESSAGES.duplicateSlot(SLOT_LABELS[slot]);
    return new AppError(409, message, { slot: message });
  }
  return err;
}

async function createReading(userId, input) {
  const { errors, data } = validateReading(input);
  if (errors) throw validationError(errors);

  await assertDayRules(userId, data);
  try {
    const { rows } = await db.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [userId, data.date, data.slot, data.value]
    );
    return toReading(rows[0]);
  } catch (err) {
    throw translateDbError(err, data.slot);
  }
}

async function getReading(userId, id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM readings WHERE id = $1 AND user_id = $2`, [
    parseId(id),
    userId,
  ]);
  if (!rows.length) throw notFound();
  return toReading(rows[0]);
}

/** Updates a reading. Fields left out of `input` keep their current values. */
async function updateReading(userId, id, input = {}) {
  const existing = await getReading(userId, id);
  const merged = {
    date: input.date !== undefined ? input.date : existing.date,
    slot: input.slot !== undefined ? input.slot : existing.slot,
    value: input.value !== undefined ? input.value : existing.value,
  };

  const { errors, data } = validateReading(merged);
  if (errors) throw validationError(errors);

  await assertDayRules(userId, data, existing.id);
  try {
    const { rows } = await db.query(
      `UPDATE readings
       SET reading_date = $1, slot = $2, value = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING ${COLUMNS}`,
      [data.date, data.slot, data.value, existing.id, userId]
    );
    return toReading(rows[0]);
  } catch (err) {
    throw translateDbError(err, data.slot);
  }
}

async function deleteReading(userId, id) {
  const { rowCount } = await db.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [parseId(id), userId]);
  if (!rowCount) throw notFound();
}

function parsePositiveInt(value, fallback, field, max = Infinity) {
  if (value === undefined || value === '') return fallback;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > max) {
    throw validationError({ [field]: `${field} must be a whole number between 1 and ${max}.` });
  }
  return num;
}

/** Lists the user's readings, newest first, with optional date filters and pagination. */
async function listReadings(userId, query = {}) {
  const page = parsePositiveInt(query.page, 1, 'page');
  const limit = parsePositiveInt(query.limit, 20, 'limit', 100);

  const where = ['user_id = $1'];
  const params = [userId];
  for (const [key, op] of [
    ['from', '>='],
    ['to', '<='],
  ]) {
    if (query[key]) {
      // Filters only need a valid date; they may be in the future.
      const error = validateDate(query[key], '9999-12-31');
      if (error) throw validationError({ [key]: error });
      params.push(query[key]);
      where.push(`reading_date ${op} $${params.length}`);
    }
  }
  const whereSql = where.join(' AND ');

  const countResult = await db.query(`SELECT COUNT(*) AS total FROM readings WHERE ${whereSql}`, params);
  const total = Number(countResult.rows[0].total);

  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM readings
     WHERE ${whereSql}
     ORDER BY reading_date DESC, ${SLOT_ORDER_SQL}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  return {
    data: rows.map(toReading),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

module.exports = {
  createReading,
  getReading,
  updateReading,
  deleteReading,
  listReadings,
  toReading,
  SLOT_ORDER_SQL,
  COLUMNS,
};
