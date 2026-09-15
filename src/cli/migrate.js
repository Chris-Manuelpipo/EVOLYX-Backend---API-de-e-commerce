require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { clearCache } = require('../utils/schema');

function splitSql(sql) {
  const statements = [];
  let current = '';
  let inDollar = false;

  for (let i = 0; i < sql.length; i++) {
    if (sql.startsWith('$$', i)) {
      inDollar = !inDollar;
      current += '$$';
      i += 1;
      continue;
    }
    if (!inDollar && sql[i] === ';') {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
      continue;
    }
    current += sql[i];
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements.filter((stmt) => {
    const stripped = stmt
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    return stripped.length > 0;
  });
}

function isSkippable(err, statement) {
  const msg = String(err.message || '');
  if (/extension/i.test(statement) && /permission|must be owner|already exists/i.test(msg)) {
    return true;
  }
  if (/invoice_token/i.test(statement) && /function gen_random_uuid/i.test(msg)) {
    return true;
  }
  return false;
}

async function migrate() {
  const sqlPath = path.join(__dirname, '../../sql/schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Application de sql/schema.sql (CREATE/ALTER IF NOT EXISTS)...');

  const client = await db.connect();
  try {
    for (const statement of splitSql(sql)) {
      try {
        await client.query(statement);
      } catch (err) {
        if (isSkippable(err, statement)) {
          console.warn('Ignoré:', err.message);
          continue;
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }

  clearCache();
  console.log('Schéma à jour.');
  await db.end();
}

migrate().catch((err) => {
  console.error('Migration échouée:', err.message);
  process.exit(1);
});
