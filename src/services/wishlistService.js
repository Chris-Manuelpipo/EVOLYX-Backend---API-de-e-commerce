const db = require('../config/database');
const { randomUUID } = require('crypto');
const HttpError = require('../utils/httpError');

const ITEM_SELECT = `
  SELECT wi.*,
         p.name,
         p.base_price,
         p.stock,
         (
           SELECT pi.image_url
           FROM product_images pi
           WHERE pi.product_id = p.id
           ORDER BY pi.is_main DESC NULLS LAST, pi.sort_order ASC
           LIMIT 1
         ) AS image
  FROM wishlist_items wi
  JOIN products p ON wi.product_id = p.id
  WHERE wi.wishlist_id = $1
  ORDER BY wi.id DESC
`;

async function loadWishlist(token) {
  const wishlistResult = await db.query(
    `SELECT * FROM wishlists WHERE token = $1`,
    [token]
  );
  if (!wishlistResult.rows[0]) {
    throw new HttpError('Liste de souhaits introuvable', 404);
  }
  const wishlist = wishlistResult.rows[0];
  const items = await db.query(ITEM_SELECT, [wishlist.id]);
  wishlist.items = items.rows;
  return wishlist;
}

exports.createWishlist = async (token) => {
  if (token) {
    const existing = await db.query(`SELECT * FROM wishlists WHERE token = $1`, [token]);
    if (existing.rows[0]) {
      return loadWishlist(token);
    }
  }

  const wishlistToken = token || randomUUID();
  await db.query(
    `INSERT INTO wishlists (token, created_at) VALUES ($1, NOW()) RETURNING *`,
    [wishlistToken]
  );
  return loadWishlist(wishlistToken);
};

exports.getWishlist = async (token) => loadWishlist(token);

exports.addItem = async (token, productId) => {
  const wishlist = await loadWishlist(token);
  const product = await db.query(`SELECT id FROM products WHERE id = $1`, [productId]);
  if (!product.rows[0]) {
    throw new HttpError('Produit non trouvé', 404);
  }

  await db.query(
    `INSERT INTO wishlist_items (wishlist_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (wishlist_id, product_id) DO NOTHING`,
    [wishlist.id, productId]
  );
  return loadWishlist(token);
};

exports.removeItem = async (token, itemOrProductId) => {
  const wishlist = await loadWishlist(token);
  const id = Number(itemOrProductId);
  const byRow = await db.query(
    `DELETE FROM wishlist_items WHERE id = $1 AND wishlist_id = $2 RETURNING id`,
    [id, wishlist.id]
  );
  if (byRow.rows[0]) {
    return loadWishlist(token);
  }
  const byProduct = await db.query(
    `DELETE FROM wishlist_items WHERE product_id = $1 AND wishlist_id = $2 RETURNING id`,
    [id, wishlist.id]
  );
  if (!byProduct.rows[0]) {
    throw new HttpError('Article introuvable dans la liste de souhaits', 404);
  }
  return loadWishlist(token);
};
