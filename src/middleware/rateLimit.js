/**
 * Rate-limit mémoire par clé (IP, etc.). Suffisant pour un petit shop.
 */
function rateLimit({ windowMs, max, keyFn, message }) {
  const attempts = new Map();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const now = Date.now();

    let record = attempts.get(key);
    if (!record || now - record.start > windowMs) {
      record = { count: 0, start: now };
    }

    record.count += 1;
    attempts.set(key, record);

    if (attempts.size > 5000) {
      for (const [storedKey, stored] of attempts) {
        if (now - stored.start > windowMs) attempts.delete(storedKey);
      }
    }

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message: message || 'Trop de requêtes, réessayez plus tard',
      });
    }

    next();
  };
}

module.exports = rateLimit;
