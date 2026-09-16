const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non autorisé' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(500).json({ success: false, message: 'Configuration auth invalide' });
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalide' });
  }
};
