const db = require('../config/database');


exports.createVariation = async (data) => {
  const result = await db.query(
    `INSERT INTO variations(product_id, color, size, stock)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [data.product_id, data.color, data.size, data.stock]
  );
  return result.rows[0];
};

exports.getProductVariations = async (product_id) => {
  const result = await db.query(
    `SELECT * FROM variations WHERE product_id=$1`,
    [product_id]
  );
  return result.rows;
};
