const db = require('../config/database');
const HttpError = require('../utils/httpError');

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

async function assertUniqueName(name, excludeId = null) {
  const values = [name];
  let sql = `
    SELECT id FROM categories
    WHERE lower(trim(name)) = lower(trim($1))
  `;
  if (excludeId != null) {
    values.push(excludeId);
    sql += ` AND id <> $${values.length}`;
  }
  sql += ' LIMIT 1';
  const existing = await db.query(sql, values);
  if (existing.rows[0]) {
    throw new HttpError('Une catégorie avec ce nom existe déjà', 409);
  }
}

exports.createCategory = async (data) => {
  const name = normalizeName(data.name);
  if (name.length < 2) {
    throw new HttpError('Nom de catégorie invalide', 400);
  }
  await assertUniqueName(name);

  try {
    const result = await db.query(
      `INSERT INTO categories(name, description)
       VALUES($1,$2) RETURNING *`,
      [name, data.description ?? null]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError('Une catégorie avec ce nom existe déjà', 409);
    }
    throw err;
  }
};

exports.updateCategory = async (id, data) => {
  const current = await exports.getOneCategory(id);
  if (!current) return null;

  const name = data.name !== undefined ? normalizeName(data.name) : current.name;
  if (name.length < 2) {
    throw new HttpError('Nom de catégorie invalide', 400);
  }
  await assertUniqueName(name, id);

  const description =
    data.description !== undefined ? data.description : current.description;

  try {
    const result = await db.query(
      `UPDATE categories
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError('Une catégorie avec ce nom existe déjà', 409);
    }
    throw err;
  }
};

exports.deleteCategory = async (id) => {
  await db.query(`DELETE FROM categories WHERE id=$1`, [id]);
};

exports.getCategories = async () => {
  const result = await db.query('SELECT * FROM categories ORDER BY id DESC');
  return result.rows;
};

exports.getOneCategory = async (id) => {
  const result = await db.query(
    `SELECT * FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};
