const request = require('supertest');
const { setupTestDb } = require('./testDb');
const app = require('../src/app');

const testDb = setupTestDb();

// Fixed past dates so the "no future dates" rule never interferes.
const DATE = '2026-10-15';

async function registerUser(email = 'asha@example.com') {
  const res = await request(app).post('/api/auth/register').send({ name: 'Asha', email, password: 'secret123' });
  return res.body.token;
}

function api(token) {
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (url) => auth(request(app).get(url)),
    post: (url, body) => auth(request(app).post(url)).send(body),
    put: (url, body) => auth(request(app).put(url)).send(body),
    delete: (url) => auth(request(app).delete(url)),
  };
}

beforeEach(() => testDb.reset());

describe('auth', () => {
  test('registers, stores a bcrypt hash and logs in', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'secret123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toEqual({ id: expect.any(Number), name: 'Asha', email: 'asha@example.com' });
    expect(reg.body.token).toBeDefined();

    const { rows } = await testDb.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toBe('secret123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);

    const login = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'secret123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('rejects a duplicate email and a wrong password', async () => {
    await registerUser();
    const dup = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'asha@example.com', password: 'secret123' });
    expect(dup.status).toBe(409);

    const bad = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrong-pass' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Invalid email or password.');
  });

  test('protects reading routes', async () => {
    const res = await request(app).get('/api/readings');
    expect(res.status).toBe(401);
  });
});

describe('readings', () => {
  test('creates, reads, updates and deletes a reading', async () => {
    const client = api(await registerUser());

    const created = await client.post('/api/readings', { date: DATE, slot: 'after_lunch', value: 145 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ date: DATE, slot: 'after_lunch', slotLabel: 'After lunch', value: 145 });

    const updated = await client.put(`/api/readings/${created.body.id}`, { value: 150 });
    expect(updated.status).toBe(200);
    expect(updated.body.value).toBe(150);

    const removed = await client.delete(`/api/readings/${created.body.id}`);
    expect(removed.status).toBe(204);
    expect((await client.get(`/api/readings/${created.body.id}`)).status).toBe(404);
  });

  test.each([
    [{ date: DATE, slot: 'morning_fasting' }, 'Please enter a glucose value.'],
    [{ date: DATE, slot: 'morning_fasting', value: 39 }, 'Value must be between 40 and 600 mg/dl.'],
    [{ date: DATE, slot: 'morning_fasting', value: 601 }, 'Value must be between 40 and 600 mg/dl.'],
    [{ date: '2999-01-01', slot: 'morning_fasting', value: 100 }, 'Date cannot be in the future.'],
  ])('rejects invalid input %p', async (body, message) => {
    const client = api(await registerUser());
    const res = await client.post('/api/readings', body);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(message);
  });

  test('allows only one reading per slot per day', async () => {
    const client = api(await registerUser());
    await client.post('/api/readings', { date: DATE, slot: 'after_lunch', value: 140 });

    const dup = await client.post('/api/readings', { date: DATE, slot: 'after_lunch', value: 150 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe('You already have an After lunch reading for this date.');

    // Same slot on another day is fine.
    const otherDay = await client.post('/api/readings', { date: '2026-10-14', slot: 'after_lunch', value: 150 });
    expect(otherDay.status).toBe(201);
  });

  test('allows at most 4 readings per day', async () => {
    const client = api(await registerUser());
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      expect((await client.post('/api/readings', { date: DATE, slot, value: 120 })).status).toBe(201);
    }
    const fifth = await client.post('/api/readings', { date: DATE, slot: 'after_dinner', value: 130 });
    expect(fifth.status).toBe(409);
    expect(fifth.body.error.message).toBe('You can add only 4 readings per day.');
  });

  test('editing a reading into a taken slot is rejected, but keeping its own slot is fine', async () => {
    const client = api(await registerUser());
    await client.post('/api/readings', { date: DATE, slot: 'morning_fasting', value: 100 });
    const lunch = await client.post('/api/readings', { date: DATE, slot: 'after_lunch', value: 160 });

    const clash = await client.put(`/api/readings/${lunch.body.id}`, { slot: 'morning_fasting' });
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toBe('You already have a Morning (fasting) reading for this date.');

    const same = await client.put(`/api/readings/${lunch.body.id}`, { slot: 'after_lunch', value: 170 });
    expect(same.status).toBe(200);
  });

  test("users only see and change their own readings", async () => {
    const asha = api(await registerUser('asha@example.com'));
    const ravi = api(await registerUser('ravi@example.com'));
    const reading = await asha.post('/api/readings', { date: DATE, slot: 'after_dinner', value: 180 });

    const list = await ravi.get('/api/readings');
    expect(list.body.data).toEqual([]);
    expect((await ravi.get(`/api/readings/${reading.body.id}`)).status).toBe(404);
    expect((await ravi.put(`/api/readings/${reading.body.id}`, { value: 100 })).status).toBe(404);
    expect((await ravi.delete(`/api/readings/${reading.body.id}`)).status).toBe(404);
  });

  test('paginates readings newest first, in slot order within a day', async () => {
    const client = api(await registerUser());
    await client.post('/api/readings', { date: '2026-10-14', slot: 'after_dinner', value: 150 });
    await client.post('/api/readings', { date: DATE, slot: 'after_dinner', value: 140 });
    await client.post('/api/readings', { date: DATE, slot: 'morning_fasting', value: 100 });

    const page1 = await client.get('/api/readings?page=1&limit=2');
    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page1.body.data.map((r) => [r.date, r.slot])).toEqual([
      [DATE, 'morning_fasting'],
      [DATE, 'after_dinner'],
    ]);

    const page2 = await client.get('/api/readings?page=2&limit=2');
    expect(page2.body.data.map((r) => r.date)).toEqual(['2026-10-14']);
  });
});

describe('reports', () => {
  test('returns daily, month-to-date and previous-month stats', async () => {
    const client = api(await registerUser());
    const readings = [
      { date: DATE, slot: 'morning_fasting', value: 100 },
      { date: DATE, slot: 'after_lunch', value: 101 },
      { date: DATE, slot: 'after_dinner', value: 101 },
      { date: '2026-10-01', slot: 'morning_fasting', value: 200 },
      { date: '2026-10-16', slot: 'morning_fasting', value: 300 }, // after selected date: excluded
      { date: '2026-09-01', slot: 'morning_fasting', value: 90 },
      { date: '2026-09-30', slot: 'after_dinner', value: 211 },
      { date: '2026-08-31', slot: 'after_dinner', value: 500 }, // two months back: excluded
    ];
    for (const r of readings) await client.post('/api/readings', r);

    const res = await client.get(`/api/reports?date=${DATE}`);
    expect(res.status).toBe(200);

    expect(res.body.daily).toMatchObject({ from: DATE, to: DATE, count: 3, highest: 101, lowest: 100, average: 100.7 });
    expect(res.body.daily.readings.map((r) => r.slotLabel)).toEqual(['Morning (fasting)', 'After lunch', 'After dinner']);

    expect(res.body.monthToDate).toMatchObject({
      from: '2026-10-01',
      to: DATE,
      count: 4,
      highest: 200,
      lowest: 100,
      average: 125.5,
    });
    expect(res.body.monthToDate.trend).toEqual([
      { date: '2026-10-01', average: 200, highest: 200, lowest: 200 },
      { date: DATE, average: 100.7, highest: 101, lowest: 100 },
    ]);

    expect(res.body.monthly).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
      count: 2,
      highest: 211,
      lowest: 90,
      average: 150.5,
    });
  });

  test('returns empty stats when there are no readings', async () => {
    const client = api(await registerUser());
    const res = await client.get(`/api/reports?date=${DATE}`);
    expect(res.body.daily).toMatchObject({ count: 0, highest: null, lowest: null, average: null, readings: [] });
    expect(res.body.monthly.count).toBe(0);
  });
});
