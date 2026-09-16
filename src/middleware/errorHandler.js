module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 0;
  let message = err.message || 'Erreur serveur';
  const pgCode = err.code;
  const httpCode = err.http_code;

  if (!status && httpCode) {
    status = Number(httpCode) || 0;
  }

  if (!status) {
    const lower = String(message).toLowerCase();
    if (/introuvable|non trouv/.test(lower)) {
      status = 404;
    } else if (/non autoris|token invalide|identifiants/.test(lower)) {
      status = 401;
    } else if (
      /stock insuffisant|transition de statut|existe déjà|duplicate|indisponible/.test(lower) ||
      pgCode === '23505'
    ) {
      status = 409;
      if (pgCode === '23505') {
        if (/categories_name_lower/i.test(String(err.constraint || err.message || ''))) {
          message = 'Une catégorie avec ce nom existe déjà';
        } else {
          message = 'Conflit: ressource déjà existante';
        }
      }
    } else if (pgCode === '23503') {
      status = 400;
      message = 'Référence invalide';
    } else if (pgCode === '22P02' || pgCode === '23502') {
      status = 400;
      message = pgCode === '23502' ? 'Champ obligatoire manquant' : 'Identifiant invalide';
    } else if (/cloudinary|upload|file too large|multer|configuration cloudinary/i.test(lower)) {
      status = 502;
    } else if (/invalide|requis|non autorisée/.test(lower)) {
      status = 400;
    } else {
      status = 500;
    }
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      if (/cloudinary|upload|file too large|multer|configuration cloudinary/i.test(String(err.message || ''))) {
        message = err.message || 'Échec de l\'upload image';
      } else if (status === 502 || status === 503) {
        message = err.message || 'Service indisponible';
      } else {
        message = 'Erreur serveur';
      }
    }
  } else {
    console.error(message);
  }

  res.status(status).json({
    success: false,
    message,
  });
};
