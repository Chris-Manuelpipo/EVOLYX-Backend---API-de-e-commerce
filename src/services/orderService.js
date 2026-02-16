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

    return order;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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


//DASHBOARD Admin

//Annuler une commande 

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
