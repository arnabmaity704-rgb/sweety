const { Pool, types } = require('pg');
const config = require('../config');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone shifts).
types.setTypeParser(1082, (value) => value);

let pool;

function getPool() {
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl });
  return pool;
}

/** Lets tests swap in another pool (e.g. an in-memory pg-mem database). */
function setPool(newPool) {
  pool = newPool;
}

function query(text, params) {
  return getPool().query(text, params);
}

async function close() {
  if (pool) await pool.end();
  pool = undefined;
}

module.exports = { query, getPool, setPool, close };
