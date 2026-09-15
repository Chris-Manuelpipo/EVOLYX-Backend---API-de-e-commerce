const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const HttpError = require('../utils/httpError');
const promoService = require('./promoService');
const { hasColumn, hasTable } = require('../utils/schema');

const FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
const PAID_STATUSES = ['confirmed', 'preparing', 'shipped', 'delivered'];

const ITEM_SELECT = `
  SELECT oi.*,
         p.name AS product_name,
         p.base_price,
         v.color,
         v.size
  FROM order_items oi
  LEFT JOIN products p ON oi.product_id = p.id
  LEFT JOIN variations v ON oi.variation_id = v.id
  WHERE oi.order_id = $1
`;

function omitInvoiceToken(order) {
  if (!order) return order;
  const { invoice_token, ...publicOrder } = order;
  return publicOrder;
}

function toTrackItem(item) {
  return {
    product_id: item.product_id,
    variation_id: item.variation_id || null,
    product_name: item.product_name || null,
    color: item.color || null,
    size: item.size || null,
    quantity: Number(item.quantity),
    price: item.price,
  };
}

function whatsappNumber() {
  const raw = process.env.WHATSAPP_NUMBER || '237654804907';
  return String(raw).replace(/[^\d]/g, '') || '237654804907';
}

function unitPrice(product, variation) {
  if (variation && variation.price != null && variation.price !== '') {
    return Number(variation.price);
  }
  return Number(product.base_price);
}

function buildTimeline(order, events) {
  if (events && events.length > 0) {
    return events.map((event) => ({
      status: event.status,
      at: event.created_at,
    }));
  }

  if (order.status === 'cancelled') {
    return [
      { status: 'pending', at: order.created_at },
      { status: 'cancelled', at: null },
    ];
  }

  const index = FLOW.indexOf(order.status);
  const reached = index >= 0 ? FLOW.slice(0, index + 1) : [order.status];
  return reached.map((status, i) => ({
    status,
    at: i === 0 ? order.created_at : null,
  }));
}

async function getStatusEvents(orderId, client = db) {
  if (!(await hasTable('order_status_events'))) return [];
  try {
    const result = await client.query(
      `SELECT status, created_at
       FROM order_status_events
       WHERE order_id = $1
       ORDER BY id ASC`,
      [orderId]
    );
    return result.rows;
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

async function ensureInvoiceToken(order, client = db) {
  if (!order || order.invoice_token) return order;
  if (!(await hasColumn('orders', 'invoice_token'))) return order;
  const token = uuidv4();
  const result = await client.query(
    `UPDATE orders
     SET invoice_token = $1
     WHERE id = $2 AND invoice_token IS NULL
     RETURNING invoice_token`,
    [token, order.id]
  );
  order.invoice_token = (result.rows[0] && result.rows[0].invoice_token) || token;
  return order;
}

async function attachTimeline(order, client = db) {
  const events = await getStatusEvents(order.id, client);
  order.timeline = buildTimeline(order, events);
  return order;
}

async function applyStockDelta(client, items, sign) {
  for (const item of items) {
    const qty = Number(item.quantity);
    if (item.variation_id) {
      const variationRes = await client.query(
        `SELECT * FROM variations WHERE id=$1 FOR UPDATE`,
        [item.variation_id]
      );
      const variation = variationRes.rows[0];
      if (!variation) {
        throw new HttpError('Variation introuvable', 404);
      }
      if (sign < 0 && variation.stock < qty) {
        throw new HttpError('Stock insuffisant', 409);
      }
      await client.query(
        `UPDATE variations SET stock = stock + $1 WHERE id=$2`,
        [sign * qty, item.variation_id]
      );
      await client.query(
        `UPDATE products SET stock = GREATEST(stock + $1, 0) WHERE id=$2`,
        [sign * qty, item.product_id]
      );
    } else {
      const productRes = await client.query(
        `SELECT * FROM products WHERE id=$1 FOR UPDATE`,
        [item.product_id]
      );
      const product = productRes.rows[0];
      if (!product) {
        throw new HttpError('Produit introuvable', 404);
      }
      if (sign < 0 && product.stock < qty) {
        throw new HttpError('Stock insuffisant', 409);
      }
      await client.query(
        `UPDATE products SET stock = stock + $1 WHERE id=$2`,
        [sign * qty, item.product_id]
      );
    }
  }
}

async function getOrderItems(orderId, client = db) {
  const itemsResult = await client.query(ITEM_SELECT, [orderId]);
  return itemsResult.rows;
}

async function loadCartLines(client, cartToken) {
  const cartResult = await client.query(
    `SELECT * FROM carts WHERE cart_token = $1`,
    [cartToken]
  );
  if (!cartResult.rows[0]) {
    throw new HttpError('Panier non trouvé', 404);
  }
  const itemsResult = await client.query(
    `SELECT product_id, variation_id, quantity
     FROM cart_items
     WHERE cart_id = $1`,
    [cartResult.rows[0].id]
  );
  return { cartId: cartResult.rows[0].id, items: itemsResult.rows };
}

exports.createOrder = async (data) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { customer_name, customer_phone, customer_address } = data;
    let items = Array.isArray(data.items) ? data.items : [];
    let cartId = null;

    if (data.cart_token) {
      try {
        const cart = await loadCartLines(client, data.cart_token);
        cartId = cart.cartId;
        if (!items.length) {
          items = cart.items;
        }
      } catch (error) {
        if (!items.length) throw error;
      }
    }

    if (!items.length) {
      throw new HttpError('Panier vide', 400);
    }

    const insertFields = ['customer_name', 'customer_phone', 'customer_address'];
    const insertValues = [customer_name, customer_phone, customer_address];
    if (await hasColumn('orders', 'invoice_token')) {
      insertFields.push('invoice_token');
      insertValues.push(uuidv4());
    }
    const placeholders = insertFields.map((_, i) => `$${i + 1}`).join(',');
    const orderResult = await client.query(
      `INSERT INTO orders(${insertFields.join(',')})
       VALUES(${placeholders}) RETURNING *`,
      insertValues
    );

    const order = orderResult.rows[0];
    let total = 0;

    for (const item of items) {
      const productResult = await client.query(
        `SELECT * FROM products WHERE id=$1 FOR UPDATE`,
        [item.product_id]
      );
      const product = productResult.rows[0];
      if (!product) {
        throw new HttpError('Produit introuvable', 404);
      }
      if (product.is_active === false) {
        throw new HttpError('Produit indisponible', 409);
      }

      let variation = null;
      if (item.variation_id) {
        const variationResult = await client.query(
          `SELECT * FROM variations WHERE id=$1 FOR UPDATE`,
          [item.variation_id]
        );
        variation = variationResult.rows[0];
        if (!variation) {
          throw new HttpError('Variation introuvable', 404);
        }
        if (Number(variation.product_id) !== Number(item.product_id)) {
          throw new HttpError('Variation incompatible avec le produit', 400);
        }
        if (variation.stock < item.quantity) {
          throw new HttpError('Stock insuffisant', 409);
        }
      } else if (product.stock < item.quantity) {
        throw new HttpError('Stock insuffisant', 409);
      }

      const price = unitPrice(product, variation);
      total += price * item.quantity;

      await client.query(
        `INSERT INTO order_items(order_id, product_id, variation_id, quantity, price)
         VALUES($1,$2,$3,$4,$5)`,
        [order.id, item.product_id, item.variation_id || null, item.quantity, price]
      );
    }

    let discount = 0;
    let promoCode = null;
    if (data.promo_code) {
      const applied = await promoService.lockAndApply(client, data.promo_code, total);
      if (applied) {
        discount = applied.discount;
        promoCode = applied.promo.code;
      }
    }

    const grandTotal = Math.max(0, Math.round((total - discount) * 100) / 100);

    const updateSets = ['total_amount=$1'];
    const updateValues = [grandTotal];
    let updateIdx = 2;
    if (await hasColumn('orders', 'promo_code')) {
      updateSets.push(`promo_code=$${updateIdx++}`, `promo_discount=$${updateIdx++}`);
      updateValues.push(promoCode, discount);
    }
    updateValues.push(order.id);
    await client.query(
      `UPDATE orders SET ${updateSets.join(', ')} WHERE id=$${updateIdx}`,
      updateValues
    );

    if (await hasTable('order_status_events')) {
      await client.query(
        `INSERT INTO order_status_events (order_id, status) VALUES ($1, 'pending')`,
        [order.id]
      );
    }

    if (cartId) {
      await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
    }

    await client.query('COMMIT');
    return exports.getOrderWithItems(order.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.getOrderWithItems = async (orderId) => {
  const orderResult = await db.query(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new HttpError('Commande non trouvée', 404);
  }

  const order = orderResult.rows[0];
  await ensureInvoiceToken(order);
  order.items = await getOrderItems(orderId);
  await attachTimeline(order);
  return order;
};

exports.createOrderWithWhatsApp = async (data) => {
  const order = await exports.createOrder(data);
  const message = exports.generateWhatsAppMessage(order);
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/${whatsappNumber()}?text=${encodedMessage}`;

  const publicOrder = omitInvoiceToken(order);

  return {
    success: true,
    order: publicOrder,
    message,
    whatsappLink,
    data: { order: publicOrder, whatsappLink, message },
  };
};

exports.generateWhatsAppMessage = (order) => {
  let message = `🛍️ *NOUVELLE COMMANDE EVOLYX* 🛍️\n\n`;
  message += `👤 *Client:* ${order.customer_name}\n`;
  message += `📞 *Téléphone:* ${order.customer_phone}\n`;
  message += `📍 *Adresse:* ${order.customer_address}\n\n`;
  message += `📦 *PRODUITS:*\n`;

  order.items.forEach((item, index) => {
    const extras = [];
    if (item.color) extras.push(item.color);
    if (item.size) extras.push(item.size);
    const variant = extras.length ? ` (${extras.join(' / ')})` : '';
    const lineTotal = Number(item.price) * item.quantity;
    message += `${index + 1}. ${item.product_name || `Produit #${item.product_id}`}${variant} x${item.quantity} = ${lineTotal} FCFA\n`;
  });

  if (order.promo_code) {
    message += `\n🎟️ Promo ${order.promo_code}: -${order.promo_discount} FCFA`;
  }
  message += `\n💰 *TOTAL: ${order.total_amount} FCFA*`;
  message += `\n⏰ *Date: ${new Date().toLocaleString()}*`;

  return message;
};

exports.confirmOrder = async (orderId) => {
  return exports.updateOrderStatus(orderId, 'confirmed');
};

exports.getAllOrders = async () => {
  const result = await db.query(`
    SELECT
      o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'variation_id', oi.variation_id,
            'color', v.color,
            'size', v.size,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN variations v ON oi.variation_id = v.id
    GROUP BY o.id
    ORDER BY o.id DESC
  `);

  return result.rows;
};

exports.getOrderById = async (orderId) => {
  return exports.getOrderWithItems(orderId);
};

exports.getOrderStatus = async (orderId) => {
  const cols = ['id', 'status', 'total_amount', 'created_at', 'customer_name', 'customer_address'];
  if (await hasColumn('orders', 'promo_code')) {
    cols.push('promo_code', 'promo_discount');
  }

  const result = await db.query(
    `SELECT ${cols.join(', ')} FROM orders WHERE id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) {
    throw new HttpError('Commande non trouvée', 404);
  }

  const order = result.rows[0];
  order.items = (await getOrderItems(orderId)).map(toTrackItem);
  await attachTimeline(order);
  return omitInvoiceToken(order);
};

exports.updateOrderStatus = async (orderId, newStatus) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id=$1 FOR UPDATE`,
      [orderId]
    );

    const order = orderRes.rows[0];
    if (!order) {
      throw new HttpError('Commande introuvable', 404);
    }

    const current = order.status;
    const allowedTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!allowedTransitions[current] || !allowedTransitions[current].includes(newStatus)) {
      throw new HttpError('Transition de statut non autorisée', 409);
    }

    const itemsRes = await client.query(
      `SELECT * FROM order_items WHERE order_id=$1`,
      [orderId]
    );
    const items = itemsRes.rows;

    if (current === 'pending' && newStatus === 'confirmed') {
      await applyStockDelta(client, items, -1);
    }

    if (newStatus === 'cancelled' && PAID_STATUSES.includes(current) && current !== 'shipped' && current !== 'delivered') {
      await applyStockDelta(client, items, 1);
    }

    await client.query(
      `UPDATE orders SET status=$1 WHERE id=$2`,
      [newStatus, orderId]
    );

    if (await hasTable('order_status_events')) {
      await client.query(
        `INSERT INTO order_status_events (order_id, status) VALUES ($1, $2)`,
        [orderId, newStatus]
      );
    }

    await client.query('COMMIT');
    return exports.getOrderWithItems(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.cancelOrder = async (orderId) => {
  return exports.updateOrderStatus(orderId, 'cancelled');
};

exports.getRevenue = async () => {
  const result = await db.query(
    `SELECT SUM(total_amount) AS revenue
     FROM orders
     WHERE status IN ('confirmed', 'preparing', 'shipped', 'delivered')`
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
