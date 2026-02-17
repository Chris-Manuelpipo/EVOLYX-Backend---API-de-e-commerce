const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

exports.login =  async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT * FROM admins WHERE email=$1`,
      [email]
    );

    const admin = result.rows[0];
    if (!admin) throw new Error("Admin introuvable");

    const match = await bcrypt.compare(password, admin.password);
    if (!match) throw new Error("Mot de passe incorrect");

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      data: { 
        token,
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role
        }
      }
    });

  } catch (err) {
    next(err);
  }
}