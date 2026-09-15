
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const HttpError = require('../utils/httpError');

// Créer un nouveau panier
exports.createCart = async () => {
  const cartToken = uuidv4(); // Génère un vrai UUID: "123e4567-e89b-12d3-a456-426614174000"
  
  const result = await db.query(
    `INSERT INTO carts (cart_token, created_at) 
     VALUES ($1, NOW()) RETURNING *`,
    [cartToken]
  );
  
  return result.rows[0];
};


// Récupérer un panier avec ses articles
exports.getCart = async (cartToken) => {
  const cartResult = await db.query(
    `SELECT * FROM carts WHERE cart_token = $1`,
    [cartToken]
  );
  
  if (cartResult.rows.length === 0) {
    throw new HttpError('Panier non trouvé', 404);
  }
  
  const cart = cartResult.rows[0];
  
  // Récupérer les articles du panier
  const itemsResult = await db.query(
    `SELECT ci.*, p.name, p.base_price,
            COALESCE(v.price, p.base_price) AS unit_price,
            (
              SELECT pi.image_url
              FROM product_images pi
              WHERE pi.product_id = p.id
              ORDER BY pi.is_main DESC NULLS LAST, pi.sort_order ASC
              LIMIT 1
            ) AS image,
            v.color, v.size
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     LEFT JOIN variations v ON ci.variation_id = v.id
     WHERE ci.cart_id = $1`,
    [cart.id]
  );
  
  cart.items = itemsResult.rows;
  
  cart.total = itemsResult.rows.reduce(
    (sum, item) => sum + (Number(item.unit_price) * item.quantity),
    0
  );
  
  return cart;
};

// Ajouter un article au panier
exports.addToCart = async (cartToken, { product_id, quantity = 1, variation_id = null }) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer le panier
    const cartResult = await client.query(
      `SELECT id FROM carts WHERE cart_token = $1`,
      [cartToken]
    );
    
    if (cartResult.rows.length === 0) {
      throw new HttpError('Panier non trouvé', 404);
    }
    
    const cartId = cartResult.rows[0].id;
    
    // Vérifier si l'article existe déjà
    const existingItem = await client.query(
      `SELECT id, quantity FROM cart_items
       WHERE cart_id = $1 AND product_id = $2
         AND (
           ($3::int IS NULL AND variation_id IS NULL)
           OR variation_id = $3::int
         )`,
      [cartId, product_id, variation_id]
    );
    
    if (existingItem.rows.length > 0) {
      // Mettre à jour la quantité
      await client.query(
        `UPDATE cart_items 
         SET quantity = quantity + $1 
         WHERE id = $2`,
        [quantity, existingItem.rows[0].id]
      );
    } else {
      // Ajouter nouveau article
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, variation_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [cartId, product_id, variation_id, quantity]
      );
    }
    
    await client.query('COMMIT');
    
    return await exports.getCart(cartToken);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Mettre à jour la quantité d'un article
exports.updateCartItem = async (cartToken, itemId, quantity) => {
  if (quantity <= 0) {
    return await exports.removeFromCart(cartToken, itemId);
  }
  
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Vérifier que l'article appartient bien au panier
    const cartResult = await client.query(
      `SELECT c.id FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       WHERE c.cart_token = $1 AND ci.id = $2`,
      [cartToken, itemId]
    );
    
    if (cartResult.rows.length === 0) {
      throw new HttpError('Article non trouvé dans ce panier', 404);
    }
    
    await client.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2`,
      [quantity, itemId]
    );
    
    await client.query('COMMIT');
    
    return await exports.getCart(cartToken);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Supprimer un article du panier
exports.removeFromCart = async (cartToken, itemId) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Vérifier que l'article appartient bien au panier
    const cartResult = await client.query(
      `SELECT c.id FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       WHERE c.cart_token = $1 AND ci.id = $2`,
      [cartToken, itemId]
    );
    
    if (cartResult.rows.length === 0) {
      throw new HttpError('Article non trouvé dans ce panier', 404);
    }
    
    await client.query(
      `DELETE FROM cart_items WHERE id = $1`,
      [itemId]
    );
    
    await client.query('COMMIT');
    
    return await exports.getCart(cartToken);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Vider le panier
exports.clearCart = async (cartToken) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const cartResult = await client.query(
      `SELECT id FROM carts WHERE cart_token = $1`,
      [cartToken]
    );
    
    if (cartResult.rows.length > 0) {
      await client.query(
        `DELETE FROM cart_items WHERE cart_id = $1`,
        [cartResult.rows[0].id]
      );
    }
    
    await client.query('COMMIT');
    
    return { message: "Panier vidé" };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.mergeCart = async (cartToken, items = []) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const cartResult = await client.query(
      `SELECT * FROM carts WHERE cart_token = $1 FOR UPDATE`,
      [cartToken]
    );
    if (!cartResult.rows[0]) {
      throw new HttpError('Panier non trouvé', 404);
    }

    const cartId = cartResult.rows[0].id;
    await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    const lines = new Map();
    for (const item of items) {
      const productId = Number(item.product_id);
      if (!productId || !item.quantity) continue;
      const variationId = item.variation_id ? Number(item.variation_id) : null;
      const key = `${productId}:${variationId || 0}`;
      const prev = lines.get(key);
      const quantity = Number(item.quantity) || 1;
      lines.set(key, {
        product_id: productId,
        variation_id: variationId,
        quantity: prev ? prev.quantity + quantity : quantity,
      });
    }

    for (const line of lines.values()) {
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, variation_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [cartId, line.product_id, line.variation_id, line.quantity]
      );
    }

    await client.query('COMMIT');
    return exports.getCart(cartToken);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};