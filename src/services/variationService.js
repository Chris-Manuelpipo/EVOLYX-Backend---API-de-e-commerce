const db = require('../config/database');

// ==================== CRUD COMPLET ====================

// CREATE - Ajouter une variation
exports.createVariation = async (data) => {
    const { product_id, color, size, stock } = data;
    
    const result = await db.query(
        `INSERT INTO variations (product_id, color, size, stock)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [product_id, color, size, stock || 0]
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
    const { color, size, stock } = data;
    
    const result = await db.query(
        `UPDATE variations 
         SET color = COALESCE($1, color),
             size = COALESCE($2, size),
             stock = COALESCE($3, stock)
         WHERE id = $4
         RETURNING *`,
        [color, size, stock, id]
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
        throw new Error('Stock insuffisant ou variation introuvable');
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
        throw new Error('Variation introuvable');
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