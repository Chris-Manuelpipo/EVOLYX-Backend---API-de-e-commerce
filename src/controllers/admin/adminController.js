
const bcrypt = require('bcrypt');
const db = require('../../config/database');

// Création admin (super_admin uniquement)
exports.createAdmin =  async (req, res, next) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: "Accès refusé"
      });
    }

    const { email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO admins(email, password, role)
       VALUES($1,$2,$3)
       RETURNING id, email, role`,
      [email, hashedPassword, role || 'admin']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
}