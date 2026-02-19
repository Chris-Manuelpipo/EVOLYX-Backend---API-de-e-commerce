const db = require('../config/database');

// CREATE avec images
// exports.createProduct = async (data, imageFiles = []) => {
//   const client = await db.connect();
  
//   try {
//     await client.query('BEGIN');
    
//     const { name, description, base_price, stock, category_id, is_featured = false } = data;
    
//     // Insérer le produit (avec is_featured)
//     const productResult = await client.query(
//       `INSERT INTO products(name, description, base_price, stock, category_id, is_featured)
//        VALUES($1,$2,$3,$4,$5,$6)
//        RETURNING *`,
//       [name, description, base_price, stock, category_id, is_featured]
//     );
    
//     const product = productResult.rows[0];
    
//     // Ajouter les images si présentes
//     if (imageFiles && imageFiles.length > 0) {
//       for (let i = 0; i < imageFiles.length; i++) {
//         await client.query(
//           `INSERT INTO product_images(product_id, image_url, is_main, sort_order)
//            VALUES($1, $2, $3, $4)`,
//           [product.id, imageFiles[i].filename, i === 0, i]
//         );
//       }
//     }
    
//     await client.query('COMMIT');
    
//     // Récupérer le produit avec ses images
//     return await exports.getOneProduct(product.id);
    
//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   } finally {
//     client.release();
//   }
// };

// CREATE avec images (version Cloudinary)
exports.createProduct = async (data, imageUrls = []) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { name, description, base_price, cost_price, stock, category_id } = data;
    
    const productResult = await client.query(
      `INSERT INTO products(name, description, base_price, cost_price, stock, category_id)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [name, description, base_price, cost_price || null, stock, category_id]
    );
    
    const product = productResult.rows[0];
    
    // Ajouter les images avec leurs URLs Cloudinary
    if (imageUrls && imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        await client.query(
          `INSERT INTO product_images(product_id, image_url, public_id, is_main, sort_order)
           VALUES($1, $2, $3, $4, $5)`,
          [product.id, imageUrls[i].url, imageUrls[i].public_id, i === 0, i]
        );
      }
    }
    
    await client.query('COMMIT');
    return await exports.getOneProduct(product.id);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Ajouter cette méthode
exports.getImageById = async (imageId) => {
  const result = await db.query(
    `SELECT * FROM product_images WHERE id = $1`,
    [imageId]
  );
  return result.rows[0];
};

// READ (avec images)
exports.getProducts = async () => {
  // ✅ CORRIGÉ: db au lieu de client
  const result = await db.query(
    `SELECT p.*, c.name AS category,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pi.id,
                  'url', pi.image_url,
                  'is_main', pi.is_main
                ) ORDER BY pi.sort_order
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'
            ) as images
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN product_images pi ON p.id = pi.product_id
     GROUP BY p.id, c.name
     ORDER BY p.id DESC`
  );

  return result.rows;
};

// READ un seul produit (avec images)
exports.getOneProduct = async (id) => {
  // ✅ CORRIGÉ: db au lieu de client
  const result = await db.query(
    `SELECT p.*, c.name AS category,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pi.id,
                  'url', pi.image_url,
                  'is_main', pi.is_main
                ) ORDER BY pi.sort_order
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'
            ) as images
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN product_images pi ON p.id = pi.product_id
     WHERE p.id = $1
     GROUP BY p.id, c.name`,
    [id]
  );
  
  return result.rows[0];
};

// UPDATE avec images
// REMPLACEZ la fonction updateProduct par :
exports.updateProduct = async (id, data, imageUrls = []) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { name, description, base_price, cost_price, stock, category_id, is_featured } = data;
    
    // Construire la requête dynamiquement
    let query = 'UPDATE products SET ';
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      query += `name = $${paramCount}, `;
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      query += `description = $${paramCount}, `;
      values.push(description);
      paramCount++;
    }
    if (base_price !== undefined) {
      query += `base_price = $${paramCount}, `;
      values.push(base_price);
      paramCount++;
    }
    if (cost_price !== undefined) {
      query += `cost_price = $${paramCount}, `;
      values.push(cost_price);
      paramCount++;
    }
    if (stock !== undefined) {
      query += `stock = $${paramCount}, `;
      values.push(stock);
      paramCount++;
    }
    if (category_id !== undefined) {
      query += `category_id = $${paramCount}, `;
      values.push(category_id);
      paramCount++;
    }
    if (is_featured !== undefined) {
      query += `is_featured = $${paramCount}, `;
      values.push(is_featured);
      paramCount++;
    }
    
    // Enlever la dernière virgule
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);
    
    const productResult = await client.query(query, values);
    
    // ✅ Ajouter les nouvelles images (Cloudinary)
    if (imageUrls && imageUrls.length > 0) {
      const existingImages = await client.query(
        `SELECT COUNT(*) FROM product_images WHERE product_id = $1`,
        [id]
      );
      
      const startOrder = parseInt(existingImages.rows[0].count);
      
      for (let i = 0; i < imageUrls.length; i++) {
        await client.query(
          `INSERT INTO product_images(product_id, image_url, public_id, is_main, sort_order)
           VALUES($1, $2, $3, $4, $5)`,
          [id, imageUrls[i].url, imageUrls[i].public_id, false, startOrder + i]
        );
      }
    }
    
    await client.query('COMMIT');
    
    return await exports.getOneProduct(id);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// DELETE avec gestion des contraintes 
exports.deleteProduct = async (id) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // ✅ Récupérer toutes les images du produit
    const images = await client.query(
      `SELECT * FROM product_images WHERE product_id = $1`,
      [id]
    );
    
    // ✅ Supprimer chaque image de Cloudinary
    const cloudinary = require('../config/cloudinary');
    for (const image of images.rows) {
      if (image.public_id) {
        await cloudinary.uploader.destroy(image.public_id);
        console.log('✅ Image supprimée de Cloudinary:', image.public_id);
      }
    }
    
    // Supprimer les références
    await client.query(`DELETE FROM order_items WHERE product_id = $1`, [id]);
    await client.query(`DELETE FROM cart_items WHERE product_id = $1`, [id]);
    await client.query(`DELETE FROM product_images WHERE product_id = $1`, [id]);
    await client.query(`DELETE FROM products WHERE id = $1`, [id]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Pagination avec images
exports.getProductsPaginated = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  // 1. Compte le total de produits
  const countResult = await db.query('SELECT COUNT(*) as total FROM products');
  const total = parseInt(countResult.rows[0].total);
  const result = await db.query(
    `SELECT p.*, 
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pi.id,
                  'url', pi.image_url,
                  'is_main', pi.is_main
                ) ORDER BY pi.sort_order
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'
            ) as images
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     GROUP BY p.id
     ORDER BY p.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    products: result.rows,
    total: total,
    page: page,
    limit: limit,
    totalPages: Math.ceil(total / limit)
  };
};

// Ajouter une image à un produit existant
exports.addProductImage = async (productId, file, isMain = false) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    console.log('📦 addProductImage:', { productId, file, isMain });
    if (isMain) {
      await client.query(
        `UPDATE product_images SET is_main = false WHERE product_id = $1`,
        [productId]
      );
    }
    
    const orderResult = await client.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order 
       FROM product_images WHERE product_id = $1`,
      [productId]
    );
    
    const nextOrder = orderResult.rows[0].next_order;
    
    const result = await client.query(
      `INSERT INTO product_images(product_id, image_url, public_id, is_main, sort_order)
       VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [productId, file.url, file.public_id, isMain, nextOrder]
    );
    
    await client.query('COMMIT');
    
    return result.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Supprimer une image
// REMPLACEZ par :
exports.deleteProductImage = async (imageId) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer l'image pour avoir le public_id
    const image = await client.query(
      `SELECT * FROM product_images WHERE id = $1`,
      [imageId]
    );
    
    if (image.rows.length === 0) {
      throw new Error('Image non trouvée');
    }
    
    // ✅ Supprimer de Cloudinary si public_id existe
    if (image.rows[0].public_id) {
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(image.rows[0].public_id);
      console.log('✅ Image supprimée de Cloudinary:', image.rows[0].public_id);
    }
    
    // Supprimer de la base
    await client.query(`DELETE FROM product_images WHERE id = $1`, [imageId]);
    
    await client.query('COMMIT');
    return { success: true };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Produits par catégorie
exports.getProductsByCategory = async (categoryId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const result = await db.query(
    `SELECT p.*, 
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pi.id,
                  'url', pi.image_url,
                  'is_main', pi.is_main
                ) ORDER BY pi.sort_order
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'
            ) as images
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     WHERE p.category_id = $1
     GROUP BY p.id
     ORDER BY p.id DESC
     LIMIT $2 OFFSET $3`,
    [categoryId, limit, offset]
  );

  return result.rows;
};

// Images d'un produit
exports.getProductImages = async (productId) => {
  const result = await db.query(
    `SELECT id, image_url, is_main, sort_order, created_at
     FROM product_images
     WHERE product_id = $1
     ORDER BY sort_order ASC`,
    [productId]
  );
  
  return result.rows;
};

// Produits vedettes
exports.getFeaturedProducts = async (limit = 5) => {
  const result = await db.query(
    `SELECT p.*, 
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pi.id,
                  'url', pi.image_url,
                  'is_main', pi.is_main
                ) ORDER BY pi.sort_order
              ) FILTER (WHERE pi.id IS NOT NULL), '[]'
            ) as images
     FROM products p
     LEFT JOIN product_images pi ON p.id = pi.product_id
     WHERE p.is_featured = true
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
};

exports.searchProducts = async (query, page = 1, limit = 12) => {
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;
    
    const result = await db.query(
        `SELECT p.*, 
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.image_url,
                            'is_main', pi.is_main
                        ) ORDER BY pi.sort_order
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
         FROM products p
         LEFT JOIN product_images pi ON p.id = pi.product_id
         WHERE p.name ILIKE $1 
            OR p.description ILIKE $1
            OR CAST(p.base_price AS TEXT) ILIKE $1
         GROUP BY p.id
         ORDER BY 
            CASE 
                WHEN p.name ILIKE $2 THEN 1
                WHEN p.description ILIKE $2 THEN 2
                ELSE 3
            END,
            p.created_at DESC
         LIMIT $3 OFFSET $4`,
        [searchPattern, query, limit, offset]
    );
    
    return result.rows;
};

// Optionnel: Compter le nombre total de résultats
exports.countSearchResults = async (query) => {
    const searchPattern = `%${query}%`;
    
    const result = await db.query(
        `SELECT COUNT(*) as total
         FROM products
         WHERE name ILIKE $1 OR description ILIKE $1`,
        [searchPattern]
    );
    
    return parseInt(result.rows[0].total);
};

// ============================================
// GET ADMIN PRODUCTS WITH FILTERS
// ============================================
exports.getAdminProducts = async (filters = {}, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const values = [];
  let whereClause = 'WHERE 1=1';
  let paramCount = 1;
  
  // ✅ Filtre par catégorie
  if (filters.category_id) {
    whereClause += ` AND p.category_id = $${paramCount}`;
    values.push(filters.category_id);
    paramCount++;
  }
  
  // ✅ Filtre par stock minimum
  if (filters.stock_min !== undefined) {
    whereClause += ` AND p.stock >= $${paramCount}`;
    values.push(filters.stock_min);
    paramCount++;
  }
  
  // ✅ Filtre par stock maximum
  if (filters.stock_max !== undefined) {
    whereClause += ` AND p.stock <= $${paramCount}`;
    values.push(filters.stock_max);
    paramCount++;
  }
  
  // ✅ Compter le total (pour la pagination)
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM products p
    ${whereClause}
  `;
  
  const countResult = await db.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total);
  
  // ✅ Récupérer les produits avec pagination
  const query = `
    SELECT p.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', pi.id,
                 'url', pi.image_url,
                 'is_main', pi.is_main
               ) ORDER BY pi.sort_order
             ) FILTER (WHERE pi.id IS NOT NULL), '[]'
           ) as images
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  
  values.push(limit, offset);
  
  const result = await db.query(query, values);
  
  return {
    products: result.rows,
    total: total,
    page: page,
    limit: limit,
    totalPages: Math.ceil(total / limit)
  };
};


// Alias
exports.getCategoryProducts = exports.getProductsByCategory;