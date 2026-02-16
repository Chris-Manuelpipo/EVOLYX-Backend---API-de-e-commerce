const db = require('../config/database');


exports.addImage = async (product_id, image_url) => {
  const result = await db.query(
    `INSERT INTO product_images(product_id, image_url)
     VALUES($1,$2) RETURNING *`,
    [product_id, image_url]
  );
  return result.rows[0];
};

exports.getImages = async (product_id) => {
  const result = await db.query(
    `SELECT * FROM product_images WHERE product_id=$1`,
    [product_id]
  );
  return result.rows;
};
