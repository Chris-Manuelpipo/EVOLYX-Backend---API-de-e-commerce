const db = require('../config/database');

const cache = new Map();

async function getColumns(table) {
  if (cache.has(table)) return cache.get(table);

  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  cache.set(table, columns);
  return columns;
}

async function hasColumn(table, column) {
  const columns = await getColumns(table);
  return columns.has(column);
}

const tableCache = new Map();

async function hasTable(table) {
  if (tableCache.has(table)) return tableCache.get(table);

  const result = await db.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const exists = result.rowCount > 0;
  tableCache.set(table, exists);
  return exists;
}

function clearCache() {
  cache.clear();
  tableCache.clear();
}

module.exports = { getColumns, hasColumn, hasTable, clearCache };
