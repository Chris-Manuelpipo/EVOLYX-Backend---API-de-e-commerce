const db = require('../config/database');
const HttpError = require('../utils/httpError');

const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'refunded'];

const STATUS_IN = {
  pending: 'requested',
  requested: 'requested',
  approved: 'approved',
  rejected: 'rejected',
  received: 'approved',
  refunded: 'refunded',
};

function toAdminReturn(row) {
  if (!row) return row;
  return {
    ...row,
    status: STATUS_IN[row.status] || row.status,
  };
}

async function getOrderItems(orderId, client = db) {
  const result = await client.query(
    `SELECT * FROM order_items WHERE order_id = $1`,
    [orderId]
  );
  return result.rows;
}

function sameLine(orderItem, requested) {
  const sameProduct = Number(orderItem.product_id) === Number(requested.product_id);
  const orderVar = orderItem.variation_id == null ? null : Number(orderItem.variation_id);
  const reqVar = requested.variation_id == null ? null : Number(requested.variation_id);
  return sameProduct && orderVar === reqVar;
}

exports.createReturn = async (orderId, data) => {
  const token = String(data.invoice_token || data.token || '').trim();
  if (!token) {
    throw new HttpError('Jeton de suivi requis', 401);
  }

  const orderResult = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  const order = orderResult.rows[0];
  if (!order || !order.invoice_token || order.invoice_token !== token) {
    throw new HttpError('Commande non trouvée', 404);
  }
  if (order.status !== 'delivered') {
    throw new HttpError('Retour possible uniquement après livraison', 409);
  }

  const existing = await db.query(
    `SELECT id FROM "returns" WHERE order_id = $1 AND status IN ('requested', 'approved') LIMIT 1`,
    [orderId]
  );
  if (existing.rows.length) {
    throw new HttpError('Un retour est déjà en cours pour cette commande', 409);
  }

  const orderItems = await getOrderItems(orderId);
  if (!orderItems.length) {
    throw new HttpError('Commande sans articles', 400);
  }

  const requestedItems = (data.items && data.items.length)
    ? data.items
    : orderItems.map((item) => ({
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
    }));

  let amount = 0;
  for (const item of requestedItems) {
    const match = orderItems.find((orderItem) => sameLine(orderItem, item));
    if (!match) {
      throw new HttpError('Article absent de la commande', 400);
    }
    if (Number(item.quantity) > Number(match.quantity)) {
      throw new HttpError('Quantité de retour invalide', 400);
    }
    amount += Number(match.price) * Number(item.quantity);
  }

  const result = await db.query(
    `INSERT INTO "returns" (order_id, reason, items, status, amount)
     VALUES ($1, $2, $3::jsonb, 'requested', $4)
     RETURNING *`,
    [orderId, data.reason, JSON.stringify(requestedItems), Math.round(amount * 100) / 100]
  );
  return toAdminReturn(result.rows[0]);
};

exports.listReturns = async () => {
  const result = await db.query(
    `SELECT r.*,
            o.customer_name,
            o.customer_phone,
            o.status AS order_status,
            o.total_amount
     FROM "returns" r
     JOIN orders o ON o.id = r.order_id
     ORDER BY r.id DESC`
  );
  return result.rows.map(toAdminReturn);
};

exports.getReturn = async (id) => {
  const result = await db.query(
    `SELECT r.*,
            o.customer_name,
            o.customer_phone,
            o.status AS order_status,
            o.total_amount
     FROM "returns" r
     JOIN orders o ON o.id = r.order_id
     WHERE r.id = $1`,
    [id]
  );
  if (!result.rows[0]) {
    throw new HttpError('Retour introuvable', 404);
  }
  return toAdminReturn(result.rows[0]);
};

exports.updateReturnStatus = async (id, status) => {
  const normalized = STATUS_IN[status];
  if (!normalized || !RETURN_STATUSES.includes(normalized)) {
    throw new HttpError('Statut de retour invalide', 400);
  }

  const result = await db.query(
    `UPDATE "returns"
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [normalized, id]
  );
  if (!result.rows[0]) {
    throw new HttpError('Retour introuvable', 404);
  }
  return toAdminReturn(result.rows[0]);
};
