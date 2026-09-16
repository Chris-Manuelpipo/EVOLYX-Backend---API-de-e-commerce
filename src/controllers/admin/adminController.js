const bcrypt = require('bcryptjs');
const db = require('../../config/database');

const ALLOWED_ROLES = new Set(['admin', 'super_admin']);

exports.createAdmin = async (req, res, next) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé',
      });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'admin');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'E-mail invalide' });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe trop court (8 caractères min.)',
      });
    }
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ success: false, message: 'Rôle invalide' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO admins(email, password, role)
       VALUES($1,$2,$3)
       RETURNING id, email, role`,
      [email, hashedPassword, role]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
