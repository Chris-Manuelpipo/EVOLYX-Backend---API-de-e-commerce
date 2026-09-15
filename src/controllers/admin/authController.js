const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

const INVALID_CREDENTIALS = 'Identifiants invalides';
const DUMMY_HASH = bcrypt.hashSync('invalid-password-dummy', 10);

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis',
      });
    }

    const result = await db.query(
      `SELECT * FROM admins WHERE email=$1`,
      [email]
    );

    const admin = result.rows[0];
    let match = false;
    try {
      match = await bcrypt.compare(password, admin ? admin.password : DUMMY_HASH);
    } catch {
      match = false;
    }

    if (!admin || !match) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS,
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET manquant');
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        role: admin.role,
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** JWT stateless : no-op côté serveur, le client jette le token. */
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Déconnecté' });
};
