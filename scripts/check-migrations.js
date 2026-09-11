// scripts/check-migrations.js
const db = require('better-sqlite3')('./ai-cfo.db');

const rows = db
  .prepare("SELECT migration_name, ran_at FROM migrations WHERE migration_name LIKE '030%' OR migration_name LIKE '031%'")
  .all();

console.log('Recent 030/031 migration records:');
console.log(rows.length ? rows : '(none)');
