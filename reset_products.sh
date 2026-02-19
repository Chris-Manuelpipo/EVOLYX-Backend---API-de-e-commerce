#!/bin/bash

# Configuration
API_URL="https://evolyx-api.onrender.com/api"
EMAIL="evolyxcmr@gmail.com"
PASSWORD="mbalach"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Connexion admin ===${NC}"
TOKEN=$(curl -s -X POST "$API_URL/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Échec de connexion${NC}"
  exit 1
fi
echo -e "${GREEN}Token obtenu${NC}"

# ============================================
# 1. Supprimer tous les produits existants
# ============================================
echo -e "\n${YELLOW}=== Suppression de tous les produits ===${NC}"

# Récupérer la liste de tous les produits (on suppose qu'il y en a moins de 100)
PRODUCTS=$(curl -s -X GET "$API_URL/admin/products?limit=100" \
  -H "Authorization: Bearer $TOKEN")deleteProduct

# Extraire les IDs avec jq si disponible, sinon avec grep
if command -v jq &> /dev/null; then
  PRODUCT_IDS=$(echo "$PRODUCTS" | jq -r '.data.products[]?.id')
else
  PRODUCT_IDS=$(echo "$PRODUCTS" | grep -o '"id":[0-9]*' | cut -d':' -f2)
fi

COUNT=0
for id in $PRODUCT_IDS; do
  echo -n "Suppression du produit $id... "
  RESPONSE=$(curl -s -X DELETE "$API_URL/admin/products/$id" \
    -H "Authorization: Bearer $TOKEN")
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}OK${NC}"
    ((COUNT++))
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

echo -e "${GREEN}Total supprimés : $COUNT${NC}"

# ============================================
# 2. Créer de nouveaux produits (montres et bijoux)
# ============================================
echo -e "\n${YELLOW}=== Création de nouveaux produits ===${NC}"

# Récupérer les IDs des catégories (supposées exister)
CAT_MONTRES=1
CAT_BIJOUX=2
# Si vous avez d'autres catégories, ajustez

# Fonction pour créer un produit
create_product() {
  local name="$1"
  local description="$2"
  local base_price="$3"
  local cost_price="$4"
  local stock="$5"
  local category_id="$6"
  local featured="$7"

  curl -s -X POST "$API_URL/admin/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$name\",
      \"description\": \"$description\",
      \"base_price\": $base_price,
      \"cost_price\": $cost_price,
      \"stock\": $stock,
      \"category_id\": $category_id,
      \"is_featured\": $featured
    }" | jq -r '.data.id'
}

# --- Montres (prix en FCFA) ---
echo "Création des montres..."

create_product "Rolex Submariner" "Montre de plongée automatique, acier inoxydable, étanche 300m" 8500000 5500000 5 $CAT_MONTRES true
create_product "Rolex Daytona" "Chronographe automatique, cadran noir, bracelet acier" 12000000 7800000 3 $CAT_MONTRES true
create_product "Audemars Piguet Royal Oak" "Montre de luxe en acier, cadran bleu, bracelet intégré" 18500000 12000000 2 $CAT_MONTRES true
create_product "Patek Philippe Nautilus" "Montre iconique en acier, cadran bleu" 25000000 16500000 1 $CAT_MONTRES true
create_product "Omega Speedmaster" "Montre de l'espace, chronographe manuel" 7200000 4800000 4 $CAT_MONTRES true
create_product "Tag Heuer Carrera" "Chronographe sportif, mouvement quartz" 3500000 2100000 8 $CAT_MONTRES false
create_product "Casio G-Shock GA-2100" "Montre digitale ultra-résistante" 150000 90000 50 $CAT_MONTRES false
create_product "Seiko Presage" "Montre automatique habillée, cadran soleil" 800000 500000 12 $CAT_MONTRES false
create_product "Tissot Le Locle" "Montre classique automatique, fond ouvert" 650000 400000 10 $CAT_MONTRES false
create_product "Hublot Big Bang" "Montre sportive de luxe, caoutchouc et céramique" 9500000 6000000 3 $CAT_MONTRES true

# --- Bijoux ---
echo "Création des bijoux..."

create_product "Chaîne en or 18 carats" "Chaîne gourmette 50cm, or jaune massif" 2500000 1700000 8 $CAT_BIJOUX true
create_product "Bracelet en argent" "Bracelet maille forçat, argent sterling 925" 350000 220000 15 $CAT_BIJOUX false
create_product "Bague solitaire" "Bague or blanc avec diamant 0.5 carat" 4200000 3000000 4 $CAT_BIJOUX true
create_product "Boucles d'oreilles perles" "Perles de culture sur attache or" 980000 650000 6 $CAT_BIJOUX false
create_product "Pendentif cœur" "Pendentif or rose avec zircon" 290000 180000 12 $CAT_BIJOUX false
create_product "Collier en or" "Collier fin 45cm, or jaune 18 carats" 1850000 1250000 7 $CAT_BIJOUX true
create_product "Bague chevalière" "Chevalière argent massif, gravable" 450000 280000 10 $CAT_BIJOUX false
create_product "Bracelet en cuir" "Bracelet tressé cuir et métal" 120000 70000 20 $CAT_BIJOUX false
create_product "Montre de poche" "Montre de poche vintage en laiton" 250000 150000 5 $CAT_BIJOUX false
create_product "Boutons de manchette" "Boutons de manchette argent avec onyx" 180000 110000 8 $CAT_BIJOUX false

# --- Quelques accessoires supplémentaires (si vous voulez) ---
# Décommentez si nécessaire
# create_product "Ceinture cuir" "Ceinture cuir véritable, boucle argent" 45000 25000 20 5 false
# create_product "Lunettes de soleil" "Lunettes polarisantes, style aviateur" 65000 38000 15 5 false

echo -e "\n${GREEN}=== Création terminée ===${NC}"