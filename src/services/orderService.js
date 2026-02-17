const db = require('../config/database');

// Création d'une commande
exports.createOrder = async (data) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { customer_name, customer_phone, customer_address, items } = data;

    const orderResult = await client.query(
      `INSERT INTO orders(customer_name, customer_phone, customer_address)
       VALUES($1,$2,$3) RETURNING *`,
      [customer_name, customer_phone, customer_address]
    );

    const order = orderResult.rows[0];

    let total = 0;

    for (const item of items) {
      const productResult = await client.query(
        `SELECT * FROM products WHERE id=$1 FOR UPDATE`,
        [item.product_id]
      );

      const product = productResult.rows[0];

      if (!product) throw new Error("Produit introuvable");

      if (product.stock < item.quantity)
        throw new Error("Stock insuffisant");

      total += product.base_price * item.quantity;

      await client.query(
        `INSERT INTO order_items(order_id, product_id, variation_id, quantity, price)
         VALUES($1,$2,$3,$4,$5)`,
        [
          order.id,
          item.product_id,
          item.variation_id || null,
          item.quantity,
          product.base_price
        ]
      );
    }

    await client.query(
      `UPDATE orders SET total_amount=$1 WHERE id=$2`,
      [total, order.id]
    );

    await client.query('COMMIT');

    // Récupérer la commande complète avec ses items
    const completeOrder = await exports.getOrderWithItems(order.id);
    return completeOrder;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Récupérer une commande avec ses items
exports.getOrderWithItems = async (orderId) => {
  const orderResult = await db.query(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId]
  );
  
  if (orderResult.rows.length === 0) {
    throw new Error("Commande non trouvée");
  }
  
  const order = orderResult.rows[0];
  
  const itemsResult = await db.query(
    `SELECT oi.*, p.name as product_name 
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  
  order.items = itemsResult.rows;
  
  return order;
};

// Créer une commande avec notification WhatsApp
exports.createOrderWithWhatsApp = async (data) => {
  // 1. Créer la commande en base
  const order = await exports.createOrder(data);
  
  // 2. Générer le message WhatsApp
  const message = exports.generateWhatsAppMessage(order);
  
  // 3. Encoder pour URL
  const encodedMessage = encodeURIComponent(message);
  
  // 4. Créer le lien WhatsApp
  const whatsappLink = `https://wa.me/237654804907?text=${encodedMessage}`;
  
  return {
    order,
    message,
    whatsappLink
  };
};

// Générer le message WhatsApp
exports.generateWhatsAppMessage = (order) => {
  let message = `🛍️ *NOUVELLE COMMANDE EVOLYX* 🛍️\n\n`;
  message += `👤 *Client:* ${order.customer_name}\n`;
  message += `📞 *Téléphone:* ${order.customer_phone}\n`;
  message += `📍 *Adresse:* ${order.customer_address}\n\n`;
  message += `📦 *PRODUITS:*\n`;

  order.items.forEach((item, index) => {
    message += `${index + 1}. ${item.product_name || `Produit #${item.product_id}`} x${item.quantity} = ${item.price * item.quantity} FCFA\n`;
  });

  message += `\n💰 *TOTAL: ${order.total_amount} FCFA*`;
  message += `\n⏰ *Date: ${new Date().toLocaleString()}*`;

  return message;
};

// Confirmation de commandes
exports.confirmOrder = async (orderId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const items = await client.query(
      `SELECT * FROM order_items WHERE order_id=$1`,
      [orderId]
    );

    for (const item of items.rows) {

      const productResult = await client.query(
        `SELECT * FROM products WHERE id=$1 FOR UPDATE`,
        [item.product_id]
      );

      const product = productResult.rows[0];

      if (product.stock < item.quantity)
        throw new Error("Stock insuffisant lors de validation");

      await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id=$2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders SET status='confirmed' WHERE id=$1`,
      [orderId]
    );

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Toutes les commandes
exports.getAllOrders = async () => {
  const result = await db.query(`
    SELECT 
      o.*,
      json_agg(
        json_build_object(
          'product_id', oi.product_id,
          'variation_id', oi.variation_id,
          'quantity', oi.quantity,
          'price', oi.price
        )
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.id DESC
  `);

  return result.rows;
};


// ============================================
// GET ORDER BY ID (avec détails)
// ============================================
exports.getOrderById = async (orderId) => {
  const client = await db.connect();
  
  try {
    // Récupérer la commande
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Commande non trouvée');
    }
    
    const order = orderResult.rows[0];
    
    // Récupérer les articles de la commande
    const itemsResult = await client.query(
      `SELECT oi.*, p.name as product_name, p.base_price 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    order.items = itemsResult.rows;
    
    return order;
    
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

// À AJOUTER dans src/services/orderService.js
exports.getOrderStatus = async (orderId) => {
  const result = await db.query(
    `SELECT id, status, total_amount, created_at 
     FROM orders 
     WHERE id = $1`,
    [orderId]
  );
  
  if (result.rows.length === 0) {
    throw new Error("Commande non trouvée");
  }
  
  return result.rows[0];
};

//DASHBOARD Admin

//Annuler une commande 

exports.updateOrderStatus = async (orderId, newStatus) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id=$1 FOR UPDATE`,
      [orderId]
    );

    const order = orderRes.rows[0];
    if (!order) throw new Error("Commande introuvable");

    const current = order.status;

    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!allowedTransitions[current].includes(newStatus)) {
      throw new Error("Transition de statut non autorisée");
    }

    // Décrément stock uniquement si passage à confirmed
    if (current === 'pending' && newStatus === 'confirmed') {

      const items = await client.query(
        `SELECT * FROM order_items WHERE order_id=$1`,
        [orderId]
      );

      for (const item of items.rows) {

        const productRes = await client.query(
          `SELECT * FROM products WHERE id=$1 FOR UPDATE`,
          [item.product_id]
        );

        const product = productRes.rows[0];

        if (product.stock < item.quantity)
          throw new Error("Stock insuffisant");

        await client.query(
          `UPDATE products
           SET stock = stock - $1
           WHERE id=$2`,
          [item.quantity, item.product_id]
        );
      }
    }

    // Réinjection stock si annulation depuis confirmed
    if (current === 'confirmed' && newStatus === 'cancelled') {

      const items = await client.query(
        `SELECT * FROM order_items WHERE order_id=$1`,
        [orderId]
      );

      for (const item of items.rows) {
        await client.query(
          `UPDATE products
           SET stock = stock + $1
           WHERE id=$2`,
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query(
      `UPDATE orders SET status=$1 WHERE id=$2`,
      [newStatus, orderId]
    );

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


exports.cancelOrder = async (orderId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const order = await client.query(
      `SELECT status FROM orders WHERE id=$1`,
      [orderId]
    );

    if (order.rows[0].status !== 'confirmed')
      throw new Error("Seules les commandes confirmées peuvent être annulées");

    const items = await client.query(
      `SELECT * FROM order_items WHERE order_id=$1`,
      [orderId]
    );

    for (const item of items.rows) {
      await client.query(
        `UPDATE products
         SET stock = stock + $1
         WHERE id=$2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders SET status='cancelled' WHERE id=$1`,
      [orderId]
    );

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getRevenue = async () => {
  const result = await db.query(
    `SELECT SUM(total_amount) AS revenue
     FROM orders
     WHERE status='confirmed'`
  );

  return result.rows[0];
};

exports.getStockValue = async () => {
  const result = await db.query(
    `SELECT SUM(stock * base_price) AS stock_value
     FROM products`
  );

  return result.rows[0];
};

exports.getBenefice = async () => {
  const result = await db.query(
    `SELECT SUM((base_price - cost_price) * stock) 
     FROM products;`
  );

  return result.rows[0];
};
