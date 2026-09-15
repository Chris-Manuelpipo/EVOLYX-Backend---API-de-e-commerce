const jwt = require('jsonwebtoken');

/** Pose req.admin si le Bearer JWT est valide, sinon continue sans erreur. */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    req.admin = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    req.admin = null;
  }
  next();
};
