const db = require('../config/database');
const HttpError = require('../utils/httpError');

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function normalizeType(type) {
  return type === 'amount' || type === 'fixed' ? 'fixed' : 'percent';
}

function emptyToNull(value) {
  return value === '' || value === undefined ? null : value;
}

function computeDiscount(promo, cartTotal) {
  const total = Math.max(0, Number(cartTotal) || 0);
  const value = Number(promo.value);
  let discount = 0;
  if (promo.type === 'percent') {
    discount = total * (value / 100);
  } else {
    discount = value;
  }
  if (discount > total) discount = total;
  return Math.round(discount * 100) / 100;
}

function assertPromoUsable(promo, cartTotal, { incrementing = false } = {}) {
  if (!promo || !promo.is_active) {
    throw new HttpError('Code promo invalide', 400);
  }

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw new HttpError('Code promo pas encore valable', 400);
  }
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    throw new HttpError('Code promo expiré', 400);
  }
  if (promo.max_uses != null && Number(promo.uses_count) >= Number(promo.max_uses)) {
    throw new HttpError('Code promo épuisé', 400);
  }
  const minAmount = Number(promo.min_amount) || 0;
  if (Number(cartTotal) < minAmount) {
    throw new HttpError(`Montant minimum ${minAmount} FCFA`, 400);
  }
  if (incrementing && promo.max_uses != null && Number(promo.uses_count) + 1 > Number(promo.max_uses)) {
    throw new HttpError('Code promo épuisé', 400);
  }
}

function toAdminPromo(promo) {
  if (!promo) return promo;
  const minAmount = Number(promo.min_amount) || 0;
  return {
    ...promo,
    type: normalizeType(promo.type),
    min_amount: minAmount,
    min_order: minAmount,
  };
}

function toPublicPromo(promo, cartTotal) {
  const discount = computeDiscount(promo, cartTotal);
  const total = Math.max(0, Number(cartTotal) || 0);
  return {
    valid: true,
    code: promo.code,
    type: normalizeType(promo.type),
    value: Number(promo.value),
    min_amount: Number(promo.min_amount) || 0,
    discount,
    new_total: Math.round((total - discount) * 100) / 100,
  };
}

exports.computeDiscount = computeDiscount;

exports.validateCode = async (code, cartTotal) => {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw new HttpError('Code promo requis', 400);
  }

  const result = await db.query(`SELECT * FROM promos WHERE code = $1`, [normalized]);
  const promo = result.rows[0];
  assertPromoUsable(promo, cartTotal);
  return toPublicPromo(promo, cartTotal);
};

exports.lockAndApply = async (client, code, cartTotal) => {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const result = await client.query(
    `SELECT * FROM promos WHERE code = $1 FOR UPDATE`,
    [normalized]
  );
  const promo = result.rows[0];
  // Valide sans consommer : la conso se fait à la confirmation
  assertPromoUsable(promo, cartTotal, { incrementing: false });

  return {
    promo,
    discount: computeDiscount(promo, cartTotal),
  };
};

exports.consumePromoCode = async (client, code) => {
  const normalized = normalizeCode(code);
  if (!normalized) return;

  const result = await client.query(
    `SELECT * FROM promos WHERE code = $1 FOR UPDATE`,
    [normalized]
  );
  const promo = result.rows[0];
  if (!promo) return;
  assertPromoUsable(promo, Number(promo.min_amount) || 0, { incrementing: true });

  await client.query(
    `UPDATE promos SET uses_count = uses_count + 1 WHERE id = $1`,
    [promo.id]
  );
};

exports.listPromos = async () => {
  const result = await db.query(`SELECT * FROM promos ORDER BY id DESC`);
  return result.rows.map(toAdminPromo);
};

exports.getPromo = async (id) => {
  const result = await db.query(`SELECT * FROM promos WHERE id = $1`, [id]);
  if (!result.rows[0]) {
    throw new HttpError('Promo introuvable', 404);
  }
  return toAdminPromo(result.rows[0]);
};

exports.createPromo = async (data) => {
  const code = normalizeCode(data.code);
  const maxUses = Number(data.max_uses);
  const result = await db.query(
    `INSERT INTO promos (code, type, value, min_amount, starts_at, ends_at, max_uses, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      code,
      normalizeType(data.type),
      data.value,
      data.min_amount ?? data.min_order ?? 0,
      emptyToNull(data.starts_at),
      emptyToNull(data.ends_at),
      Number.isFinite(maxUses) && maxUses > 0 ? maxUses : null,
      data.is_active !== false,
    ]
  );
  return toAdminPromo(result.rows[0]);
};

exports.updatePromo = async (id, data) => {
  const existing = await exports.getPromo(id);

  const nextType = data.type !== undefined ? normalizeType(data.type) : normalizeType(existing.type);
  const nextValue = data.value !== undefined ? Number(data.value) : Number(existing.value);
  if (nextType === 'percent' && (!Number.isFinite(nextValue) || nextValue <= 0 || nextValue > 100)) {
    throw new HttpError('Pour un pourcentage, la valeur doit être entre 1 et 100', 400);
  }

  const fields = [];
  const values = [];
  let i = 1;
  const map = {
    code: data.code !== undefined ? normalizeCode(data.code) : undefined,
    type: data.type !== undefined ? normalizeType(data.type) : undefined,
    value: data.value,
    min_amount: data.min_amount !== undefined ? data.min_amount : data.min_order,
    starts_at: data.starts_at !== undefined ? emptyToNull(data.starts_at) : undefined,
    ends_at: data.ends_at !== undefined ? emptyToNull(data.ends_at) : undefined,
    max_uses:
      data.max_uses !== undefined
        ? (Number(data.max_uses) > 0 ? Number(data.max_uses) : null)
        : undefined,
    is_active: data.is_active,
  };

  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(value);
      i += 1;
    }
  }

  if (!fields.length) {
    return exports.getPromo(id);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE promos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return toAdminPromo(result.rows[0]);
};

exports.deletePromo = async (id) => {
  const result = await db.query(`DELETE FROM promos WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    throw new HttpError('Promo introuvable', 404);
  }
  return { deleted: true };
};
