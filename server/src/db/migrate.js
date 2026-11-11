const fs = require('fs');
const path = require('path');
const db = require('./index');

const schemaSql = () => fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

async function migrate() {
  await db.query(schemaSql());
}

if (require.main === module) {
  migrate()
    .then(() => console.log('Database schema is up to date.'))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}

module.exports = { migrate, schemaSql };
