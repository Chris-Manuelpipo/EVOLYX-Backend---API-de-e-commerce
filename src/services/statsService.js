const db = require('../config/database');
const { hasColumn } = require('../utils/schema');

exports.getDashboardStats = async () => {
  const activeFilter = (await hasColumn('products', 'is_active'))
    ? 'WHERE is_active = true'
    : '';
  const activeAnd = activeFilter
    ? 'AND is_active = true'
    : '';

  const totalProducts = await db.query(`SELECT COUNT(*) FROM products ${activeFilter}`);

  const todayOrders = await db.query(`
    SELECT COUNT(*) FROM orders
    WHERE DATE(created_at) = CURRENT_DATE
  `);

  const monthlyRevenue = await db.query(`
    SELECT COALESCE(SUM(total_amount), 0) as revenue
    FROM orders
    WHERE status IN ('confirmed', 'preparing', 'shipped', 'delivered')
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  `);

  const outOfStock = await db.query(`
    SELECT COUNT(*) FROM products
    WHERE stock <= 0 ${activeAnd}
  `);

  const totalStockValue = await db.query(`
    SELECT COALESCE(SUM(base_price * stock), 0) as value
    FROM products
    ${activeFilter}
  `);

  return {
    totalProducts: parseInt(totalProducts.rows[0].count, 10),
    todayOrders: parseInt(todayOrders.rows[0].count, 10),
    monthlyRevenue: parseFloat(monthlyRevenue.rows[0].revenue),
    outOfStock: parseInt(outOfStock.rows[0].count, 10),
    totalStockValue: parseFloat(totalStockValue.rows[0].value),
  };
};
