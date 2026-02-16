const db = require('../config/database');

exports.createCategory = async (data) => {
  const result = await db.query(
    `INSERT INTO categories(name, description)
     VALUES($1,$2) RETURNING *`,
    [data.name, data.description]
  );
  return result.rows[0];
};

exports.deleteCategory = async (id) => {
  await db.query(`DELETE FROM categories WHERE id=$1`, [id]);
};


exports.getCategories = async () => {
  const result = await db.query('SELECT * FROM categories ORDER BY id DESC');
  return result.rows;
};
