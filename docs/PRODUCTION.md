# Production — API EVOLYX Shop

Checklist courte. Pas de secrets ici.

## Render

- Service Node, commande `npm start`, `NODE_ENV=production`.
- `DATABASE_URL` Postgres (SSL auto hors localhost).
- Variables : `JWT_SECRET` (long, unique), `CLOUDINARY_*`, `WHATSAPP_NUMBER`, `CORS_ORIGINS` si besoin.
- Health check : `GET /api/health`.
- HTTPS est fourni par Render ; forcer le domaine API en `https://`.

## CORS / domaine boutique

Déjà autorisé : `https://shop.evolyx.cm`, `https://evolyx.cm`, `https://www.evolyx.cm`, localhost de dev.
Ajouter d’autres origines via `CORS_ORIGINS` (liste séparée par des virgules).

## Backups

- Activer les backups automatiques Postgres sur Render.
- Dump manuel : `pg_dump "$DATABASE_URL" -Fc -f evolyx-$(date +%Y%m%d).dump`
- Restauration : `pg_restore --clean --no-owner -d "$DATABASE_URL" fichier.dump`
- Après déploiement : `npm run db:migrate` (idempotent, jamais `db:reset` en prod).

## Boutique (Vercel)

- Domaine canonique : `https://shop.evolyx.cm` (`CANONICAL` dans `js/config.js`).
- HTTPS fourni par Vercel. `robots.txt` et `sitemap.xml` à la racine du shop.

## Rate-limit

- Login admin : 8 tentatives / 15 min / IP+email (`loginThrottle`).
- `POST /api/orders` : 20 / 15 min / IP.
- `trust proxy` est activé (IP réelle derrière Render).

## 2FA admin (à venir)

Non implémenté. Pas de `POST /admin/login/2fa`.
Piste prévue : TOTP optionnel (`otplib`) avec secret par admin ou `ADMIN_TOTP_SECRET` global, QR au premier login, code exigé si activé.
En attendant : mot de passe fort, JWT 24 h, rotation de `JWT_SECRET` si fuite.

## Logs

`morgan` `combined` en production. Ne pas logger tokens, Authorization, ni `.env`.
