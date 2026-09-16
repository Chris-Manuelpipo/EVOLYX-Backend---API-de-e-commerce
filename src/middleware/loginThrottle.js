const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();

function keyFrom(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const email = String((req.body && req.body.email) || '').toLowerCase();
  return `${ip}:${email}`;
}

function check(req, res, next) {
  const key = keyFrom(req);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now - record.start <= WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Trop de tentatives, réessayez plus tard',
    });
  }

  next();
}

function recordFailure(req) {
  const key = keyFrom(req);
  const now = Date.now();
  let record = attempts.get(key);
  if (!record || now - record.start > WINDOW_MS) {
    record = { count: 0, start: now };
  }
  record.count += 1;
  attempts.set(key, record);
}

function clear(req) {
  attempts.delete(keyFrom(req));
}

module.exports = check;
module.exports.recordFailure = recordFailure;
module.exports.clear = clear;
