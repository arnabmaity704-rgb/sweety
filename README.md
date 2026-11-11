# Sweety – Blood Glucose Tracker

Sweety is a small web app where a diabetes patient records up to four blood glucose readings a day and views daily, month-to-date and monthly reports.

- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), bcrypt (`bcryptjs`), JWT auth
- **Frontend:** React 19 (Vite), React Router, Recharts
- **Tests:** Jest + Supertest (API, using an in-memory PostgreSQL via `pg-mem`), Vitest + React Testing Library (reading form)

## Features

**Required**
- Sign up / log in. Passwords are hashed with bcrypt. Every reading query is scoped to the logged-in user.
- Add, view, edit and delete readings (date, slot, value in mg/dl). Validation runs in both the UI and the API:
  - value is required, and must be a whole number between 40 and 600
  - one reading per slot per day (also enforced by a `UNIQUE` constraint in the database)
  - at most 4 readings per day
  - the date cannot be in the future
- Reports for a selected date: **Daily**, **Month-to-date** and **Previous month**. Each shows the highest, lowest and average (1 decimal) reading and the number of readings, with an empty state when there is no data. The daily report also lists each reading with its slot.

**Bonus**
- Pagination: `GET /api/readings?page=1&limit=20`
- A line chart of the month-to-date trend (daily average / highest / lowest)
- `docker-compose.yml` for PostgreSQL and the API
- Frontend tests for the reading form

## Project structure

```
server/
  src/
    app.js, server.js, config.js, constants.js
    db/          schema.sql, migrate.js, seed.js, index.js (pg pool)
    middleware/  auth (JWT), error handler
    routes/      auth, readings, reports (thin HTTP layer)
    services/    business rules: auth, readings, reports
    utils/       validation, dates/report ranges, stats, errors
  tests/         unit tests + API tests
client/
  src/
    api/         fetch wrapper
    context/     auth state
    components/  ReadingForm, ReportCard, TrendChart, ...
    pages/       Login, Register, Readings, Reports
```

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer, installed locally **or** run with Docker (see below)

## 1. Install

```bash
git clone <this-repo-url> sweety
cd sweety
npm run install:all        # installs server/ and client/ dependencies
```

## 2. Set up the database

Create the environment files from the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env   # optional, the defaults work
```

Edit `DATABASE_URL` in `server/.env` if your PostgreSQL user, password or port are different.

**Option A: local PostgreSQL**

```bash
createdb sweety            # or in psql: CREATE DATABASE sweety;
```

**Option B: Docker**

```bash
docker compose up -d db    # PostgreSQL on localhost:5432, database "sweety", user/password postgres/postgres
```

Then create the tables and the demo user:

```bash
npm run db:setup           # = migrate (creates tables) + seed (demo user with sample readings)
```

You can also run the two steps separately with `npm run db:migrate --prefix server` and `npm run db:seed --prefix server`. Running the seed again resets the demo user's readings.

**Demo account**: `demo@sweety.app` / `demo1234`. It has readings from the 1st of last month up to today, so every report has data.

## 3. Run the server and client

In two terminals:

```bash
npm run server     # API on http://localhost:5000 (auto-restarts on changes)
npm run client     # React app on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server forwards `/api` requests to the API.

To run the API in Docker instead: `docker compose up --build`. This starts PostgreSQL and the API and applies the schema. Seed it with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/sweety npm run db:seed --prefix server`, then run the client with `npm run client`.

## 4. Run the tests

```bash
npm test                   # server and client tests
npm test --prefix server   # API + unit tests (Jest)
npm test --prefix client   # reading form tests (Vitest + React Testing Library)
```

The server tests **don't need a running PostgreSQL**. They load the real `schema.sql` into `pg-mem`, an in-memory PostgreSQL emulator, and send real HTTP requests through Supertest. They cover:

- registration, bcrypt hashing, login, and protected routes
- every validation rule and its exact error message
- the one-per-slot and four-per-day rules, including edits
- users being unable to see or change each other's readings
- pagination and ordering
- report numbers: ranges, rounding, exclusion of readings outside the range, and the empty state
- report date ranges, including January to December and leap years

## API

All endpoints except register and login need an `Authorization: Bearer <token>` header. Errors return `{ "error": { "message": "...", "fields": { "value": "..." } } }`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, password }` → `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | The current user |
| GET | `/api/readings?page=1&limit=20&from=&to=` | Paginated readings, newest first → `{ data, pagination }` |
| POST | `/api/readings` | `{ date: "YYYY-MM-DD", slot, value }` |
| GET | `/api/readings/:id` | A single reading |
| PUT | `/api/readings/:id` | Update a reading (any of `date`, `slot`, `value`) |
| DELETE | `/api/readings/:id` | Delete a reading (204) |
| GET | `/api/reports?date=YYYY-MM-DD` | `{ daily, monthToDate, monthly }` for the date (default: today) |

Slot values: `morning_fasting`, `after_breakfast`, `after_lunch`, `after_dinner`.

## Screenshots

All screenshots and a screen recording ([`docs/demo-recording.webm`](docs/demo-recording.webm)) are in [`docs/`](docs/README.md).

![Reports](docs/screenshots/12-reports.png)

![Readings](docs/screenshots/10-readings-list.png)

![Validation error](docs/screenshots/06-error-duplicate-slot.png)

## Notes

### Assumptions
- **"Today"** for the future-date rule is the server's local date (it can be set with the `TZ` env variable). The UI also blocks future dates using the browser's date. A user in a timezone far ahead of the server could be refused a reading for "their" today. Sending the client's timezone with each request would fix this.
- **Rule order:** the 4-per-day check runs before the duplicate-slot check. With exactly 4 slots and one reading allowed per slot, a 5th reading always uses a taken slot. Checking the count first means the "You can add only 4 readings per day." message actually appears on a full day. On days that aren't full, adding to a taken slot shows the duplicate-slot message.
- **Monthly report** is the whole calendar month before the selected date's month (selected 15 Oct 2026 → 1–30 Sep 2026), as in the brief.
- **Reports** can't be requested for a future date. Readings after the selected date are excluded from the month-to-date report.
- **Rounding:** only the average is rounded (to 1 decimal). Highest and lowest are always whole numbers.
- **Value badges** (low < 70, high > 180 mg/dl) are only a visual hint and not medical advice.
- `bcryptjs` is used instead of the native `bcrypt` package. It is the same bcrypt algorithm and hash format, but needs no C++ build tools, which makes setup easier on Windows.
- Auth uses a JWT stored in `localStorage` to keep things simple (see improvements below).

### What I'd improve with more time
- Store the token in an httpOnly cookie instead of `localStorage`, and add rate limiting on login.
- Use proper migration tooling (for example node-pg-migrate) instead of one idempotent `schema.sql`.
- Run the API tests against a real PostgreSQL in CI (Docker service) as well as `pg-mem`.
- Add more frontend tests (pages, auth flow) and an end-to-end test with Playwright.
- Filter readings by date range in the UI (the API already supports `from`/`to`).
- Remaining bonus tasks: Redis caching of reports, a BullMQ reminder job, and a doctor role.
- Add mmol/L display, notes per reading, and CSV export.
