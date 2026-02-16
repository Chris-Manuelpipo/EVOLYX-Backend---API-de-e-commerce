const db = require('../config/database');

exports.createProduct = async (data) => {
  const { name, description, base_price, stock, category_id } = data;

  const result = await db.query(
    `INSERT INTO products(name, description, base_price, stock, category_id)
     VALUES($1,$2,$3,$4,$5)
     RETURNING *`,
    [name, description, base_price, stock, category_id]
  );

  return result.rows[0];
};

exports.updateProduct = async (id, data) => {
  const result = await db.query(
    `UPDATE products
     SET name=$1, description=$2, base_price=$3, stock=$4, category_id=$5
     WHERE id=$6 RETURNING *`,
    [data.name, data.description, data.base_price, data.stock, data.category_id, id]
  );

  return result.rows[0];
};

exports.deleteProduct = async (id) => {
  await db.query(`DELETE FROM products WHERE id=$1`, [id]);
};

exports.getOneProduct = async (id) => {
  const result = await db.query(
    `SELECT * FROM products WHERE id=$1`,
    [id]
  );
  return result.rows[0];
};


exports.getProducts = async () => {
  const result = await db.query(
    `SELECT p.*, c.name AS category
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ORDER BY p.id DESC`
  );

  return result.rows;
};


exports.updateProduct = async (id, data) => {
  const result = await db.query(
    `UPDATE products
     SET name=$1, description=$2, base_price=$3, stock=$4, category_id=$5
     WHERE id=$6 RETURNING *`,
    [data.name, data.description, data.base_price, data.stock, data.category_id, id]
  );

  return result.rows[0];
};

exports.deleteProduct = async (id) => {
  await db.query(`DELETE FROM products WHERE id=$1`, [id]);
};

exports.getOneProduct = async (id) => {
  const result = await db.query(
    `SELECT * FROM products WHERE id=$1`,
    [id]
  );
  return result.rows[0];
};

//Pagination

exports.getProductsPaginated = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const result = await db.query(
    `SELECT * FROM products
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};
