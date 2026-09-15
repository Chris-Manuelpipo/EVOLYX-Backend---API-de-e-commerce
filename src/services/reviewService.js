const db = require('../config/database');
const HttpError = require('../utils/httpError');

exports.listByProduct = async (productId) => {
  const [listResult, statsResult] = await Promise.all([
    db.query(
      `SELECT id, product_id, name, rating, comment, created_at
       FROM reviews
       WHERE product_id = $1
       ORDER BY id DESC`,
      [productId]
    ),
    db.query(
      `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count
       FROM reviews
       WHERE product_id = $1`,
      [productId]
    ),
  ]);

  const reviews = listResult.rows.map((row) => ({
    ...row,
    author_name: row.name,
  }));
  const average = Number(statsResult.rows[0].average) || 0;
  const count = statsResult.rows[0].count || 0;

  return {
    reviews,
    average: count ? Math.round(average * 10) / 10 : null,
    count,
  };
};

exports.createReview = async (productId, data) => {
  const product = await db.query(`SELECT id FROM products WHERE id = $1`, [productId]);
  if (!product.rows[0]) {
    throw new HttpError('Produit non trouvé', 404);
  }

  const name = data.name || data.author_name;
  const comment = data.comment || data.body || null;
  const result = await db.query(
    `INSERT INTO reviews (product_id, name, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, product_id, name, rating, comment, created_at`,
    [productId, name, data.rating, comment]
  );
  const row = result.rows[0];
  return { ...row, author_name: row.name };
};

exports.deleteReview = async (id) => {
  const result = await db.query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    throw new HttpError('Avis introuvable', 404);
  }
  return { deleted: true };
};
