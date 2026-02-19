const db = require('../config/database');

exports.getDashboardStats = async () => {
  // Nombre total de produits
  const totalProducts = await db.query('SELECT COUNT(*) FROM products WHERE is_active = true');
  
  // Nombre de commandes aujourd'hui
  const todayOrders = await db.query(`
    SELECT COUNT(*) FROM orders 
    WHERE DATE(created_at) = CURRENT_DATE
  `);
  
  // Chiffre d'affaires du mois
  const monthlyRevenue = await db.query(`
    SELECT COALESCE(SUM(total_amount), 0) as revenue 
    FROM orders 
    WHERE status = 'confirmed' 
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  `);
  
  // Produits en rupture de stock
  const outOfStock = await db.query(`
    SELECT COUNT(*) FROM products 
    WHERE stock <= 0 AND is_active = true
  `);

  const totalStockValue = await db.query(`
    SELECT COALESCE(SUM(base_price * stock), 0) as value 
    FROM products 
    WHERE is_active = true
  `);
  
  return {
    totalProducts: parseInt(totalProducts.rows[0].count),
    todayOrders: parseInt(todayOrders.rows[0].count),
    monthlyRevenue: parseFloat(monthlyRevenue.rows[0].revenue),
    outOfStock: parseInt(outOfStock.rows[0].count),
    totalStockValue: parseFloat(totalStockValue.rows[0].value)
  };
};