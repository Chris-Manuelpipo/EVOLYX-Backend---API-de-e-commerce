// imageService.js
const db = require('../config/database');
const cloudinary = require('../config/cloudinary'); // Si vous avez un fichier de config séparé

// ============================================
// AJOUTER UNE IMAGE (avec public_id Cloudinary)
// ============================================
exports.addImage = async (product_id, imageData) => {
  // imageData = { url: cloudinaryUrl, public_id: cloudinaryPublicId }
  
  const result = await db.query(
    `INSERT INTO product_images(product_id, image_url, public_id)
     VALUES($1, $2, $3) RETURNING *`,
    [product_id, imageData.url, imageData.public_id]
  );
  return result.rows[0];
};

// ============================================
// AJOUTER UNE IMAGE PRINCIPALE
// ============================================
exports.addMainImage = async (product_id, imageData) => {
  // D'abord, enlever le statut main des autres images
  await db.query(
    `UPDATE product_images SET is_main = false WHERE product_id = $1`,
    [product_id]
  );

  // Ajouter la nouvelle image principale
  const result = await db.query(
    `INSERT INTO product_images(product_id, image_url, public_id, is_main, sort_order)
     VALUES($1, $2, $3, true, 0) RETURNING *`,
    [product_id, imageData.url, imageData.public_id]
  );
  return result.rows[0];
};

// ============================================
// AJOUTER PLUSIEURS IMAGES
// ============================================
exports.addMultipleImages = async (product_id, imagesData) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtenir le nombre d'images existantes pour le sort_order
    const existingImages = await client.query(
      `SELECT COUNT(*) FROM product_images WHERE product_id = $1`,
      [product_id]
    );
    
    const startOrder = parseInt(existingImages.rows[0].count);
    const results = [];
    
    for (let i = 0; i < imagesData.length; i++) {
      const result = await client.query(
        `INSERT INTO product_images(product_id, image_url, public_id, is_main, sort_order)
         VALUES($1, $2, $3, $4, $5) RETURNING *`,
        [product_id, imagesData[i].url, imagesData[i].public_id, i === 0, startOrder + i]
      );
      results.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    return results;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// RÉCUPÉRER LES IMAGES D'UN PRODUIT
// ============================================
exports.getImages = async (product_id) => {
  const result = await db.query(
    `SELECT * FROM product_images 
     WHERE product_id = $1 
     ORDER BY sort_order ASC, created_at DESC`,
    [product_id]
  );
  return result.rows;
};

// ============================================
// RÉCUPÉRER UNE IMAGE PAR SON ID
// ============================================
exports.getImageById = async (imageId) => {
  const result = await db.query(
    `SELECT * FROM product_images WHERE id = $1`,
    [imageId]
  );
  return result.rows[0];
};

// ============================================
// SUPPRIMER UNE IMAGE (de la DB et de Cloudinary)
// ============================================
exports.deleteImage = async (imageId) => {
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
    
    // Supprimer de Cloudinary
    if (image.rows[0].public_id) {
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(image.rows[0].public_id);
    }
    
    // Supprimer de la base de données
    await client.query(
      `DELETE FROM product_images WHERE id = $1`,
      [imageId]
    );
    
    await client.query('COMMIT');
    return { success: true, message: 'Image supprimée' };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// SUPPRIMER TOUTES LES IMAGES D'UN PRODUIT
// ============================================
exports.deleteAllProductImages = async (product_id) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Récupérer toutes les images du produit
    const images = await client.query(
      `SELECT * FROM product_images WHERE product_id = $1`,
      [product_id]
    );
    
    // Supprimer chaque image de Cloudinary
    const cloudinary = require('../config/cloudinary');
    for (const image of images.rows) {
      if (image.public_id) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    }
    
    // Supprimer de la base de données
    await client.query(
      `DELETE FROM product_images WHERE product_id = $1`,
      [product_id]
    );
    
    await client.query('COMMIT');
    return { success: true, message: 'Toutes les images supprimées' };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// METTRE À JOUR LE STATUT D'UNE IMAGE (principale/secondaire)
// ============================================
exports.setMainImage = async (product_id, imageId) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Enlever le statut main de toutes les images
    await client.query(
      `UPDATE product_images SET is_main = false WHERE product_id = $1`,
      [product_id]
    );
    
    // Mettre la nouvelle image principale
    const result = await client.query(
      `UPDATE product_images SET is_main = true WHERE id = $1 AND product_id = $2 RETURNING *`,
      [imageId, product_id]
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