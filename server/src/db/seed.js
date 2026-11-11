/**
 * Creates (or resets) a demo user with sample readings from the 1st of the
 * previous month up to today, so every report has data to show.
 *
 *   Email:    demo@sweety.app
 *   Password: demo1234
 */
const bcrypt = require('bcryptjs');
const db = require('./index');
const { migrate } = require('./migrate');
const { SLOT_KEYS } = require('../constants');
const { todayString } = require('../utils/dates');

const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'demo1234' };

// Typical ranges per slot, so the sample data looks realistic.
const SLOT_RANGES = {
  morning_fasting: [80, 140],
  after_breakfast: [120, 220],
  after_lunch: [110, 230],
  after_dinner: [120, 250],
};

// Small deterministic random generator: the seed produces the same data every run.
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildSampleReadings(today = todayString()) {
  const random = createRandom(42);
  const [y, m, d] = today.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 2, 1)); // 1st of the previous month
  const end = new Date(Date.UTC(y, m - 1, d));
  const readings = [];

  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    for (const slot of SLOT_KEYS) {
      if (random() < 0.15) continue; // patients sometimes miss a reading
      const [min, max] = SLOT_RANGES[slot];
      readings.push({ date, slot, value: Math.round(min + random() * (max - min)) });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return readings;
}

async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash(DEMO.password, 10);

  const client = await db.getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [DEMO.name, DEMO.email, passwordHash]
    );
    const userId = rows[0].id;

    await client.query('DELETE FROM readings WHERE user_id = $1', [userId]);
    const readings = buildSampleReadings();
    for (const r of readings) {
      await client.query('INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)', [
        userId,
        r.date,
        r.slot,
        r.value,
      ]);
    }
    await client.query('COMMIT');
    return readings.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then((count) => {
      console.log(`Seeded demo user with ${count} readings.`);
      console.log(`  Email:    ${DEMO.email}`);
      console.log(`  Password: ${DEMO.password}`);
    })
    .catch((err) => {
      console.error('Seeding failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

module.exports = { seed, buildSampleReadings, DEMO };
