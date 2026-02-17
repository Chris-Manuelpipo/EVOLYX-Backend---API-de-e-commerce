# EVOLYX Backend API Documentation

Base URL:
http://localhost:5000/api

---

# 🔐 AUTHENTIFICATION ADMIN

## Login
POST /api/admin/login

Body:
{
  "email": "admin@email.com",
  "password": "password"
}

Response:
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN"
  }
}

Durée session: 24h

---

# 🛍️ ROUTES PUBLIQUES

---

## 📦 Produits

### Liste paginée
GET /api/products?page=1&limit=10

### Détail produit
GET /api/products/:id

---

## 🛒 Panier

### Créer panier
POST /api/cart

### Voir panier
GET /api/cart/:token

### Ajouter produit
POST /api/cart/items

Body:
{
  "cart_token": "uuid",
  "product_id": 1,
  "variation_id": null,
  "quantity": 2
}

### Modifier quantité
PUT /api/cart/items/:id

### Supprimer item
DELETE /api/cart/items/:id

---

## 📲 Commande via WhatsApp

POST /api/orders

Body:
{
  "customer_name": "Jean Dupont",
  "customer_phone": "670000000",
  "customer_address": "Yaoundé",
  "items": [
    {
      "product_id": 1,
      "variation_id": null,
      "quantity": 2
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "order_id": 10,
    "whatsapp_url": "https://wa.me/..."
  }
}

---

# 🔒 ROUTES ADMIN (JWT REQUIRED)

Header obligatoire:
Authorization: Bearer JWT_TOKEN

---

## 🛍️ Gestion Produits

### Créer produit
POST /api/admin/products

### Modifier produit
PUT /api/admin/products/:id

### Supprimer (soft delete)
DELETE /api/admin/products/:id

---

## 📦 Gestion Commandes

### Voir toutes commandes
GET /api/admin/orders

### Mettre à jour statut
PUT /api/admin/orders/:id/status

Body:
{
  "status": "confirmed"
}

Statuts autorisés:
- pending
- confirmed
- delivered
- cancelled

Workflow:
pending → confirmed → delivered
confirmed → cancelled
pending → cancelled

---

## 📊 Dashboard Stats

GET /api/admin/stats?start=2026-01-01&end=2026-12-31

Retourne:
- total_orders
- pending
- confirmed
- delivered
- cancelled
- revenue
- stock_value
- profit
- monthly_revenue
- top_products

---

## 👤 Gestion Admins

### Créer admin (super_admin only)
POST /api/admin/admins

Body:
{
  "email": "newadmin@email.com",
  "password": "password",
  "role": "admin"
}

---

# 🗄️ STATUS CODES

200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Server Error

---

# 🧠 BONNES PRATIQUES

- Toutes les réponses:
{
  "success": true,
  "data": ...
}

- Soft delete pour produits
- Transactions SQL pour commandes
- Stock décrémenté uniquement à confirmation
- Annulation réinjecte stock
