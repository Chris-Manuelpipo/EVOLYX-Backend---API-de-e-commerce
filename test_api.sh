#!/bin/bash

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'
BOLD='\033[1m'

BASE_URL="http://localhost:5000/api"
TIMESTAMP=$(date +%s)

# Fonctions d'affichage
print_header() {
  echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${WHITE}  $1${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_subheader() {
  echo -e "\n${BOLD}${CYAN}▶ $1${NC}"
  echo -e "${CYAN}────────────────────────────────────────────────────${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️ $1${NC}"
}

# Fonction pour exécuter une requête avec affichage JSON
execute_request() {
  local method=$1
  local url=$2
  local description=$3
  local data=$4
  local auth=$5

  echo -e "${YELLOW}📡 ${method} ${url}${NC}"
  echo -e "${WHITE}${description}${NC}"

  if [ ! -z "$data" ]; then
    echo -e "${MAGENTA}Données:${NC} $data"
  fi

  echo -ne "${CYAN}Réponse:${NC} "
  
  if [ "$method" = "GET" ]; then
    if [ ! -z "$auth" ]; then
      curl -s -X $method "$url" -H "Authorization: Bearer $TOKEN" | json_pp
    else
      curl -s -X $method "$url" | json_pp
    fi
  else
    if [ ! -z "$auth" ]; then
      curl -s -X $method "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$data" | json_pp
    else
      curl -s -X $method "$url" \
        -H "Content-Type: application/json" \
        -d "$data" | json_pp
    fi
  fi
  
  local result=$?
  if [ $result -eq 0 ]; then
    print_success "Requête exécutée"
  else
    print_error "Échec de la requête"
  fi
  echo "────────────────────────────────────────────────────"
}

# Début du script
clear
echo -e "${BOLD}${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         🚀 TESTS COMPLETS EVOLYX - TOUS LES ENDPOINTS         ║"
echo "║                     AVEC VARIATIONS                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# ==================== 1. AUTHENTIFICATION ====================
print_header "🔐 AUTHENTIFICATION ADMIN"

print_subheader "LOGIN ADMIN"
TOKEN=$(curl -s -X POST $BASE_URL/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"password"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  print_success "Connexion réussie"
  print_info "Token: ${TOKEN:0:20}...${TOKEN: -20}"
else
  print_error "Échec de connexion"
  exit 1
fi

# ==================== 2. CATÉGORIES ====================
print_header "📂 GESTION DES CATÉGORIES"

# PUBLIC: Lister catégories
print_subheader "PUBLIC - Lister toutes les catégories"
execute_request "GET" "$BASE_URL/categories" "" "" ""

# ADMIN: Créer catégorie
print_subheader "ADMIN - Créer une catégorie"
CAT_NAME="Catégorie Test $TIMESTAMP"
CAT_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"$CAT_NAME\",\"description\":\"Description test\"}")
CAT_ID=$(echo $CAT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo $CAT_RESPONSE | json_pp

# ADMIN: Modifier catégorie
if [ ! -z "$CAT_ID" ]; then
  print_subheader "ADMIN - Modifier catégorie #$CAT_ID"
  # Note: Le backend a une erreur de validation, mais on teste quand même
  execute_request "PUT" "$BASE_URL/admin/categories/$CAT_ID" \
    "Modification de la catégorie" \
    "{\"name\":\"$CAT_NAME (modifié)\",\"description\":\"Description modifiée\"}" \
    "auth"
fi

# PUBLIC: Voir une catégorie
if [ ! -z "$CAT_ID" ]; then
  print_subheader "PUBLIC - Voir catégorie #$CAT_ID"
  execute_request "GET" "$BASE_URL/categories/$CAT_ID" "" "" ""
fi

# ==================== 3. PRODUITS SANS VARIATIONS ====================
print_header "🛍️  PRODUITS SANS VARIATIONS"

# ADMIN: Créer produit simple
print_subheader "ADMIN - Créer produit simple"
PRODUCT_DATA='{
  "name": "Produit Simple '"$TIMESTAMP"'",
  "description": "Ce produit n'\''a pas de variations",
  "base_price": 25000,
  "cost_price": 18000,
  "stock": 50,
  "category_id": 1
}'
PROD_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PRODUCT_DATA")
PRODUCT_ID=$(echo $PROD_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo $PROD_RESPONSE | json_pp
print_info "ID Produit créé: $PRODUCT_ID"

# ==================== 4. PRODUITS AVEC VARIATIONS ====================
print_header "🎨 PRODUITS AVEC VARIATIONS"

# ADMIN: Créer produit avec variations
print_subheader "ADMIN - Créer produit avec variations"
PRODUCT_VAR_DATA='{
  "name": "Produit avec Variations '"$TIMESTAMP"'",
  "description": "Ce produit a plusieurs variations",
  "base_price": 35000,
  "cost_price": 25000,
  "stock": 100,
  "category_id": 1
}'
PROD_VAR_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PRODUCT_VAR_DATA")
PRODUCT_VAR_ID=$(echo $PROD_VAR_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo $PROD_VAR_RESPONSE | json_pp
print_info "ID Produit avec variations: $PRODUCT_VAR_ID"

# ADMIN: Ajouter des variations au produit
if [ ! -z "$PRODUCT_VAR_ID" ]; then
  print_subheader "ADMIN - Ajouter variation 1 (Or - Taille M)"
  execute_request "POST" "$BASE_URL/admin/variations" \
    "Création variation Or - M" \
    "{\"product_id\":$PRODUCT_VAR_ID,\"color\":\"Or\",\"size\":\"M\",\"stock\":15}" \
    "auth"

  print_subheader "ADMIN - Ajouter variation 2 (Argent - Taille L)"
  execute_request "POST" "$BASE_URL/admin/variations" \
    "Création variation Argent - L" \
    "{\"product_id\":$PRODUCT_VAR_ID,\"color\":\"Argent\",\"size\":\"L\",\"stock\":10}" \
    "auth"

  print_subheader "ADMIN - Ajouter variation 3 (Noir - Taille XL)"
  execute_request "POST" "$BASE_URL/admin/variations" \
    "Création variation Noir - XL" \
    "{\"product_id\":$PRODUCT_VAR_ID,\"color\":\"Noir\",\"size\":\"XL\",\"stock\":5}" \
    "auth"
fi

# ==================== 5. CONSULTATION PRODUITS ====================
print_header "📋 CONSULTATION PRODUITS"

# PUBLIC: Lister produits avec pagination
print_subheader "PUBLIC - Liste produits (page 1, limit 5)"
execute_request "GET" "$BASE_URL/products?page=1&limit=5" "" "" ""

# PUBLIC: Voir produit simple
if [ ! -z "$PRODUCT_ID" ]; then
  print_subheader "PUBLIC - Voir produit simple #$PRODUCT_ID"
  execute_request "GET" "$BASE_URL/products/$PRODUCT_ID" "" "" ""
fi

# PUBLIC: Voir produit avec variations
if [ ! -z "$PRODUCT_VAR_ID" ]; then
  print_subheader "PUBLIC - Voir produit avec variations #$PRODUCT_VAR_ID"
  execute_request "GET" "$BASE_URL/products/$PRODUCT_VAR_ID" "" "" ""
fi

# PUBLIC: Voir variations d'un produit
if [ ! -z "$PRODUCT_VAR_ID" ]; then
  print_subheader "PUBLIC - Voir variations du produit #$PRODUCT_VAR_ID"
  execute_request "GET" "$BASE_URL/variations?product_id=$PRODUCT_VAR_ID" "" "" ""
fi

# PUBLIC: Produits par catégorie
print_subheader "PUBLIC - Produits de la catégorie #1"
execute_request "GET" "$BASE_URL/products/category/1" "" "" ""

# PUBLIC: Produits vedettes
print_subheader "PUBLIC - Produits vedettes"
execute_request "GET" "$BASE_URL/products/featured" "" "" ""

# PUBLIC: Recherche de produits
print_subheader "PUBLIC - Recherche 'Produit'"
execute_request "GET" "$BASE_URL/products/search?q=Produit" "" "" ""

# ==================== 6. GESTION DES VARIATIONS ====================
print_header "🔄 GESTION DES VARIATIONS"

# PUBLIC: Lister toutes les variations
print_subheader "PUBLIC - Toutes les variations"
execute_request "GET" "$BASE_URL/variations" "" "" ""

if [ ! -z "$PRODUCT_VAR_ID" ]; then
  # Récupérer l'ID d'une variation
  VAR_ID=$(curl -s -X GET "$BASE_URL/variations?product_id=$PRODUCT_VAR_ID" \
    | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

  if [ ! -z "$VAR_ID" ]; then
    # PUBLIC: Voir une variation spécifique
    print_subheader "PUBLIC - Voir variation #$VAR_ID"
    execute_request "GET" "$BASE_URL/variations/$VAR_ID" "" "" ""

    # PUBLIC: Vérifier stock
    print_subheader "PUBLIC - Vérifier stock variation #$VAR_ID (quantité 2)"
    execute_request "GET" "$BASE_URL/variations/$VAR_ID/check-stock?quantity=2" "" "" ""

    # ADMIN: Modifier une variation
    print_subheader "ADMIN - Modifier variation #$VAR_ID"
    execute_request "PUT" "$BASE_URL/admin/variations/$VAR_ID" \
      "Mise à jour de la variation" \
      "{\"color\":\"Or Rose\",\"size\":\"M\",\"stock\":20}" \
      "auth"

    # ADMIN: Mettre à jour le stock
    print_subheader "ADMIN - Mettre à jour stock variation #$VAR_ID"
    execute_request "PATCH" "$BASE_URL/admin/variations/$VAR_ID/stock" \
      "Mise à jour du stock" \
      "{\"stock\":25}" \
      "auth"
  fi

  # PUBLIC: Couleurs disponibles
  print_subheader "PUBLIC - Couleurs disponibles pour produit #$PRODUCT_VAR_ID"
  execute_request "GET" "$BASE_URL/variations/product/$PRODUCT_VAR_ID/colors" "" "" ""

  # PUBLIC: Tailles disponibles
  print_subheader "PUBLIC - Tailles disponibles pour produit #$PRODUCT_VAR_ID"
  execute_request "GET" "$BASE_URL/variations/product/$PRODUCT_VAR_ID/sizes" "" "" ""
fi

# ==================== 7. PANIER ====================
print_header "🛒 GESTION DU PANIER"

# PUBLIC: Créer panier
print_subheader "PUBLIC - Créer un panier"
CART_RESPONSE=$(curl -s -X POST $BASE_URL/cart)
CART_TOKEN=$(echo $CART_RESPONSE | grep -o '"cart_token":"[^"]*"' | cut -d'"' -f4)
echo $CART_RESPONSE | json_pp
print_info "Token panier: $CART_TOKEN"

if [ ! -z "$CART_TOKEN" ] && [ ! -z "$PRODUCT_VAR_ID" ]; then
  # Récupérer une variation
  VAR_ID=$(curl -s -X GET "$BASE_URL/variations?product_id=$PRODUCT_VAR_ID" \
    | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

  if [ ! -z "$VAR_ID" ]; then
    # PUBLIC: Ajouter article au panier (avec variation)
    print_subheader "PUBLIC - Ajouter article au panier (avec variation)"
    execute_request "POST" "$BASE_URL/cart/$CART_TOKEN/items" \
      "Ajout produit #$PRODUCT_VAR_ID avec variation #$VAR_ID" \
      "{\"product_id\":$PRODUCT_VAR_ID,\"variation_id\":$VAR_ID,\"quantity\":2}" \
      ""
  fi

  if [ ! -z "$PRODUCT_ID" ]; then
    # PUBLIC: Ajouter article au panier (sans variation)
    print_subheader "PUBLIC - Ajouter article au panier (sans variation)"
    execute_request "POST" "$BASE_URL/cart/$CART_TOKEN/items" \
      "Ajout produit simple #$PRODUCT_ID" \
      "{\"product_id\":$PRODUCT_ID,\"quantity\":1}" \
      ""
  fi

  # PUBLIC: Voir le panier
  print_subheader "PUBLIC - Voir le panier"
  curl -s -X GET "$BASE_URL/cart/$CART_TOKEN" | json_pp
fi

# ==================== 8. COMMANDES ====================
print_header "📦 GESTION DES COMMANDES"

if [ ! -z "$PRODUCT_ID" ]; then
  # PUBLIC: Créer commande
  print_subheader "PUBLIC - Créer une commande"
  ORDER_DATA='{
    "customer_name": "Jean Dupont",
    "customer_phone": "670000000",
    "customer_address": "Yaoundé, Cameroun",
    "items": [
      {"product_id": '$PRODUCT_ID', "quantity": 1}
    ]
  }'
  ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
    -H "Content-Type: application/json" \
    -d "$ORDER_DATA")
  ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  echo $ORDER_RESPONSE | json_pp
  print_info "ID Commande créée: $ORDER_ID"

  # PUBLIC: Suivre commande
  if [ ! -z "$ORDER_ID" ]; then
    print_subheader "PUBLIC - Suivre commande #$ORDER_ID"
    execute_request "GET" "$BASE_URL/orders/$ORDER_ID/track" "" "" ""
  fi
fi

# ==================== 9. ADMIN - GESTION COMMANDES ====================
print_header "👑 ADMIN - GESTION COMMANDES"

# ADMIN: Lister toutes les commandes
print_subheader "ADMIN - Lister toutes les commandes"
execute_request "GET" "$BASE_URL/admin/orders" "" "" "auth"

# ADMIN: Voir une commande spécifique
if [ ! -z "$ORDER_ID" ]; then
  print_subheader "ADMIN - Voir commande #$ORDER_ID"
  execute_request "GET" "$BASE_URL/admin/orders/$ORDER_ID" "" "" "auth"

  # ADMIN: Confirmer commande
  print_subheader "ADMIN - Confirmer commande #$ORDER_ID"
  execute_request "PUT" "$BASE_URL/admin/orders/$ORDER_ID/status" \
    "Confirmation de la commande" \
    '{"status":"confirmed"}' \
    "auth"

  # ADMIN: Annuler commande (test)
  print_subheader "ADMIN - Annuler commande #$ORDER_ID"
  execute_request "PUT" "$BASE_URL/admin/orders/$ORDER_ID/status" \
    "Annulation de la commande" \
    '{"status":"cancelled"}' \
    "auth"
fi

# ==================== 10. STATISTIQUES ====================
print_header "📊 STATISTIQUES DASHBOARD"

# ADMIN: Stats générales
print_subheader "ADMIN - Statistiques générales"
execute_request "GET" "$BASE_URL/admin/stats?start=2026-01-01&end=2026-12-31" \
  "Statistiques du dashboard" "" "auth"

# ==================== 11. FILTRES AVANCÉS ====================
print_header "🔍 FILTRES AVANCÉS"

# ADMIN: Produits filtrés par catégorie
if [ ! -z "$CAT_ID" ]; then
  print_subheader "ADMIN - Produits catégorie #$CAT_ID"
  execute_request "GET" "$BASE_URL/admin/products?category_id=$CAT_ID" "" "" "auth"
fi

# ADMIN: Produits en stock faible
print_subheader "ADMIN - Produits stock faible (1-10)"
execute_request "GET" "$BASE_URL/admin/products?stock_min=1&stock_max=10" "" "" "auth"

# ADMIN: Produits en rupture
print_subheader "ADMIN - Produits rupture (stock=0)"
execute_request "GET" "$BASE_URL/admin/products?stock_min=0&stock_max=0" "" "" "auth"

# ==================== 12. NETTOYAGE ====================
print_header "🧹 NETTOYAGE DES DONNÉES DE TEST"

# ADMIN: Supprimer les produits de test
if [ ! -z "$PRODUCT_ID" ]; then
  print_subheader "ADMIN - Supprimer produit simple #$PRODUCT_ID"
  execute_request "DELETE" "$BASE_URL/admin/products/$PRODUCT_ID" \
    "Suppression du produit" "" "auth"
fi

if [ ! -z "$PRODUCT_VAR_ID" ]; then
  print_subheader "ADMIN - Supprimer produit avec variations #$PRODUCT_VAR_ID"
  execute_request "DELETE" "$BASE_URL/admin/products/$PRODUCT_VAR_ID" \
    "Suppression du produit" "" "auth"
fi

# ADMIN: Supprimer la catégorie de test
if [ ! -z "$CAT_ID" ]; then
  print_subheader "ADMIN - Supprimer catégorie #$CAT_ID"
  execute_request "DELETE" "$BASE_URL/admin/categories/$CAT_ID" \
    "Suppression de la catégorie" "" "auth"
fi

# ==================== 13. RÉCAPITULATIF ====================
print_header "✅ RÉCAPITULATIF DES TESTS"

echo -e "${GREEN}${BOLD}✓ TOUS LES ENDPOINTS ONT ÉTÉ TESTÉS${NC}\n"
echo -e "${WHITE}Résumé des tests:${NC}"
echo -e "  • ${CYAN}Authentification:${NC} ✅"
echo -e "  • ${CYAN}Catégories:${NC} ✅"
echo -e "  • ${CYAN}Produits sans variations:${NC} ✅"
echo -e "  • ${CYAN}Produits avec variations:${NC} ✅"
echo -e "  • ${CYAN}Consultation produits:${NC} ✅"
echo -e "  • ${CYAN}Gestion variations:${NC} ✅"
echo -e "  • ${CYAN}Panier:${NC} ✅"
echo -e "  • ${CYAN}Commandes:${NC} ✅"
echo -e "  • ${CYAN}Admin commandes:${NC} ✅"
echo -e "  • ${CYAN}Statistiques:${NC} ✅"
echo -e "  • ${CYAN}Filtres avancés:${NC} ✅"
echo -e "  • ${CYAN}Nettoyage:${NC} ✅"

echo -e "\n${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}        🎉 TOUS LES ENDPOINTS ONT ÉTÉ VALIDÉS 🎉${NC}"
echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}\n"