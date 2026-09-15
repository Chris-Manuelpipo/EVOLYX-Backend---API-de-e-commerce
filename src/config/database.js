require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { resolveConfig, shouldUseSsl, toPgOptions } = require('./databaseConfig');

const cfg = resolveConfig();
const ssl = shouldUseSsl(cfg.host);
const pool = new Pool(toPgOptions(cfg));

console.log(`Postgres: host=${cfg.host} db=${cfg.database} ssl=${Boolean(ssl)}`);

module.exports = pool;
