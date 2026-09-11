// scripts/diagnose-users-fk.js
// Lists all tables that reference users(id) as a foreign key

const db = require('better-sqlite3')('./ai-cfo.db');

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((t) => t.name);

console.log('📋 Tables in DB:', tables.join(', '));
console.log('');
console.log('🔗 Tables referencing users:');

let found = 0;
for (const t of tables) {
  try {
    const fks = db.prepare(`PRAGMA foreign_key_list(${t})`).all();
    for (const fk of fks) {
      if (fk.table === 'users') {
        console.log(`  → ${t}.${fk.from} → users.${fk.to}`);
        found++;
      }
    }
  } catch (e) {
    // some tables don't exist or are virtual — ignore
  }
}

if (found === 0) {
  console.log('  (none)');
}

console.log('');
console.log('📋 Users table schema:');
console.log(JSON.stringify(db.prepare('PRAGMA table_info(users)').all(), null, 2));