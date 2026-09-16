const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const loginThrottle = require('../../middleware/loginThrottle');

const INVALID_CREDENTIALS = 'Identifiants invalides';
let dummyHash;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync('invalid-password-dummy', 10);
  return dummyHash;
}

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
      match = await bcrypt.compare(password, admin ? admin.password : getDummyHash());
    } catch {
      match = false;
    }

    if (!admin || !match) {
      loginThrottle.recordFailure(req);
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS,
      });
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET manquant ou trop court (min. 32 caractères)');
    }

    loginThrottle.clear(req);

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256' }
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

exports.me = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, role FROM admins WHERE id = $1`,
      [req.admin.id]
    );
    const admin = result.rows[0];
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Session invalide' });
    }
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
};
