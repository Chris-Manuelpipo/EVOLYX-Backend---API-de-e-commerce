require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { resolveConfig, toPgOptions } = require('../config/databaseConfig');

function assertSafeDbName(name) {
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    console.error('Nom de base invalide.');
    process.exit(1);
  }
  return name;
}

async function createDatabase() {
  const cfg = resolveConfig();
  const name = assertSafeDbName(cfg.database);
  const client = new Client(toPgOptions(cfg, { database: 'postgres' }));

  await client.connect();
  const exists = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [name]
  );
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${name}"`);
    console.log(`Base ${name} créée.`);
  } else {
    console.log(`Base ${name} déjà existante.`);
  }
  await client.end();
}

createDatabase().catch((err) => {
  console.error('db:create échoué:', err.message);
  console.error('Vérifier que Postgres tourne, puis : npm run db:create && npm run db:migrate');
  process.exit(1);
});
