require('./loadEnv');
const { Pool } = require('pg');
const { resolveConfig, shouldUseSsl, toPgOptions } = require('./databaseConfig');

let pool;

function getPool() {
  if (pool) return pool;
  const cfg = resolveConfig();
  const ssl = shouldUseSsl(cfg.host);
  pool = new Pool({
    ...toPgOptions(cfg),
    // Vercel : au moins 2 pour éviter les deadlocks (transaction + hasColumn).
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  console.log(`Postgres: host=${cfg.host} db=${cfg.database} ssl=${Boolean(ssl)}`);
  return pool;
}

module.exports = new Proxy({}, {
  get(_target, prop) {
    const instance = getPool();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
