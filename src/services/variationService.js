const db = require('../config/database');
const HttpError = require('../utils/httpError');
const { hasColumn } = require('../utils/schema');

// ==================== CRUD COMPLET ====================

// CREATE - Ajouter une variation
exports.createVariation = async (data) => {
    const { product_id, color, size, stock, price } = data;

    const fields = ['product_id', 'color', 'size', 'stock'];
    const values = [product_id, color, size, stock || 0];

    if (price !== undefined && await hasColumn('variations', 'price')) {
        fields.push('price');
        values.push(price);
    }

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
        `INSERT INTO variations (${fields.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// READ ALL - Toutes les variations (avec filtre optionnel)
exports.getVariations = async (filters = {}) => {
    let query = 'SELECT * FROM variations WHERE 1=1';
    const values = [];
    let paramCount = 1;
    
    if (filters.product_id) {
        query += ` AND product_id = $${paramCount}`;
        values.push(filters.product_id);
        paramCount++;
    }
    
    if (filters.color) {
        query += ` AND color ILIKE $${paramCount}`;
        values.push(`%${filters.color}%`);
        paramCount++;
    }
    
    if (filters.size) {
        query += ` AND size ILIKE $${paramCount}`;
        values.push(`%${filters.size}%`);
        paramCount++;
    }
    
    if (filters.in_stock === 'true') {
        query += ` AND stock > 0`;
    }
    
    query += ' ORDER BY id DESC';
    
    const result = await db.query(query, values);
    return result.rows;
};

// READ ONE - Une variation par ID
exports.getVariationById = async (id) => {
    const result = await db.query(
        `SELECT v.*, p.name as product_name, p.base_price 
         FROM variations v
         JOIN products p ON v.product_id = p.id
         WHERE v.id = $1`,
        [id]
    );
    
    return result.rows[0];
};

// READ BY PRODUCT - Toutes les variations d'un produit
exports.getVariationsByProduct = async (productId) => {
    const result = await db.query(
        `SELECT * FROM variations 
         WHERE product_id = $1 
         ORDER BY 
            CASE WHEN color IS NULL THEN 1 ELSE 0 END,
            color,
            size`,
        [productId]
    );
    
    return result.rows;
};

// UPDATE - Modifier une variation
exports.updateVariation = async (id, data) => {
    const { color, size, stock, price } = data;

    const fields = [];
    const values = [];
    let param = 1;

    if (color !== undefined) {
        fields.push(`color = $${param++}`);
        values.push(color);
    }
    if (size !== undefined) {
        fields.push(`size = $${param++}`);
        values.push(size);
    }
    if (stock !== undefined) {
        fields.push(`stock = $${param++}`);
        values.push(stock);
    }
    if (price !== undefined && await hasColumn('variations', 'price')) {
        fields.push(`price = $${param++}`);
        values.push(price);
    }

    if (fields.length === 0) {
        return exports.getVariationById(id);
    }

    values.push(id);
    const result = await db.query(
        `UPDATE variations SET ${fields.join(', ')} WHERE id = $${param} RETURNING *`,
        values
    );

    return result.rows[0];
};

// UPDATE STOCK - Mise à jour rapide du stock
exports.updateStock = async (id, newStock) => {
    const result = await db.query(
        `UPDATE variations 
         SET stock = $1 
         WHERE id = $2 
         RETURNING *`,
        [newStock, id]
    );
    
    return result.rows[0];
};

// DECREMENT STOCK - Pour les commandes
exports.decrementStock = async (id, quantity = 1) => {
    const result = await db.query(
        `UPDATE variations 
         SET stock = stock - $1 
         WHERE id = $2 AND stock >= $1
         RETURNING *`,
        [quantity, id]
    );
    
    if (result.rows.length === 0) {
        throw new HttpError('Stock insuffisant ou variation introuvable', 409);
    }
    
    return result.rows[0];
};

// DELETE - Supprimer une variation
exports.deleteVariation = async (id) => {
    await db.query('DELETE FROM variations WHERE id = $1', [id]);
    return { success: true };
};

// CHECK STOCK - Vérifier disponibilité
exports.checkStock = async (id, requestedQuantity) => {
    const result = await db.query(
        `SELECT stock FROM variations WHERE id = $1`,
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new HttpError('Variation introuvable', 404);
    }
    
    return result.rows[0].stock >= requestedQuantity;
};

// GET AVAILABLE COLORS - Couleurs disponibles pour un produit
exports.getAvailableColors = async (productId) => {
    const result = await db.query(
        `SELECT DISTINCT color, 
                SUM(stock) as total_stock
         FROM variations 
         WHERE product_id = $1 AND color IS NOT NULL
         GROUP BY color
         ORDER BY color`,
        [productId]
    );
    
    return result.rows;
};

// GET AVAILABLE SIZES - Tailles disponibles pour un produit/couleur
exports.getAvailableSizes = async (productId, color = null) => {
    let query = `SELECT DISTINCT size, SUM(stock) as total_stock
                 FROM variations 
                 WHERE product_id = $1 AND size IS NOT NULL`;
    const values = [productId];
    
    if (color) {
        query += ` AND color = $2`;
        values.push(color);
    }
    
    query += ` GROUP BY size ORDER BY size`;
    
    const result = await db.query(query, values);
    return result.rows;
};