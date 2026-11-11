// Spins up an in-memory PostgreSQL (pg-mem) with the real schema, so API tests
// run real SQL without needing a database server.
const { newDb } = require('pg-mem');
const db = require('../src/db');
const { schemaSql } = require('../src/db/migrate');

function setupTestDb() {
  const mem = newDb();
  mem.public.none(schemaSql());
  const { Pool } = mem.adapters.createPg();
  db.setPool(new Pool());

  const backup = mem.backup();
  return {
    reset: () => backup.restore(),
    query: (sql, params) => db.query(sql, params),
  };
}

module.exports = { setupTestDb };
