module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 0;
  let message = err.message || 'Erreur serveur';
  const pgCode = err.code;

  if (!status) {
    const lower = String(message).toLowerCase();
    if (/introuvable|non trouv/.test(lower)) {
      status = 404;
    } else if (/non autoris|token invalide|identifiants/.test(lower)) {
      status = 401;
    } else if (/stock insuffisant|transition de statut|existe déjà|duplicate|indisponible/.test(lower) || pgCode === '23505') {
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
    } else if (pgCode === '22P02') {
      status = 400;
      message = 'Identifiant invalide';
    } else if (/invalide|requis|non autorisée/.test(lower)) {
      status = 400;
    } else {
      status = 500;
    }
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Erreur serveur';
    }
  } else {
    console.error(message);
  }

  res.status(status).json({
    success: false,
    message,
  });
};
