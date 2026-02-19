#!/bin/bash

# Configuration
API_URL="http://localhost:5000/api"
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
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Échec de connexion${NC}"
  exit 1
fi
echo -e "${GREEN}Token obtenu${NC}"

# ============================================
# Création des catégories
# ============================================
echo -e "\n${YELLOW}=== Création des catégories ===${NC}"
categories=("Bijoux" "Pochettes" "Gourdes" "Montres" "Accessoires")
declare -A cat_ids

for cat in "${categories[@]}"; do
  echo -n "Création de la catégorie '$cat'... "
  response=$(curl -s -X POST "$API_URL/admin/categories" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"name\":\"$cat\",\"description\":\"Tous nos produits de la catégorie $cat.\"}")
  
  id=$(echo "$response" | jq -r '.data.id')
  if [ "$id" != "null" ] && [ -n "$id" ]; then
    echo -e "${GREEN}OK (id: $id)${NC}"
    cat_ids[$cat]=$id
  else
    echo -e "${RED}ÉCHEC${NC}"
    echo "$response"
  fi
done

# ============================================
# Fonction pour créer un produit
# ============================================
create_product() {
  local name="$1"
  local description="$2"
  local price="$3"
  local category_id="$4"
  local stock="$5"
  local featured="$6"  # true/false

  local data=$(jq -n \
    --arg name "$name" \
    --arg desc "$description" \
    --argjson price "$price" \
    --argjson cat "$category_id" \
    --argjson stock "$stock" \
    --argjson featured "$featured" \
    '{name: $name, description: $desc, base_price: $price, category_id: $cat, stock: $stock, is_featured: $featured}')

  response=$(curl -s -X POST "$API_URL/admin/products" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$data")

  product_id=$(echo "$response" | jq -r '.data.id')
  if [ "$product_id" != "null" ] && [ -n "$product_id" ]; then
    echo "$product_id"
  else
    echo "0"
    echo "$response" >&2
  fi
}

# ============================================
# Fonction pour créer une variation
# ============================================
create_variation() {
  local product_id="$1"
  local color="$2"
  local size="$3"
  local stock="$4"

  local data=$(jq -n \
    --argjson pid "$product_id" \
    --arg color "$color" \
    --arg size "$size" \
    --argjson stock "$stock" \
    '{product_id: $pid, color: $color, size: $size, stock: $stock}')

  response=$(curl -s -X POST "$API_URL/admin/variations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$data")

  if echo "$response" | jq -e '.success' >/dev/null; then
    return 0
  else
    return 1
  fi
}

# ============================================
# Création des produits
# ============================================
echo -e "\n${YELLOW}=== Création des produits (cela peut prendre un moment) ===${NC}"

# Récupération des IDs
montres_id=${cat_ids["Montres"]}
bijoux_id=${cat_ids["Bijoux"]}
pochettes_id=${cat_ids["Pochettes"]}
gourdes_id=${cat_ids["Gourdes"]}
accessoires_id=${cat_ids["Accessoires"]}

total=0
featured_count=0

# --- Montres (environ 50) ---
montre_models=(
  "Audemars Piguet Royal Oak"
  "Audemars Piguet Offshore"
  "Rolex Submariner"
  "Rolex Daytona"
  "Rolex Datejust"
  "Rolex GMT-Master II"
  "Casio G-Shock GA-2100"
  "Casio Edifice EFR-539"
  "Casio Vintage A158W"
  "Poedagar Chronograph"
  "Poedagar Automatic"
  "Patek Philippe Nautilus"
  "Patek Philippe Calatrava"
  "Patek Philippe Aquanaut"
  "Patek Philippe Complications"
)

# Descriptions génériques pour montres
montre_desc=(
  "Montre de luxe en acier inoxydable, mouvement automatique, cadran bleu, bracelet métal."
  "Montre sportive étanche 300m, lunette tournante, mouvement quartz, bracelet caoutchouc."
  "Montre classique avec date, mouvement automatique, cadran blanc, bracelet cuir."
  "Montre chronographe avec compteurs, mouvement quartz, cadran noir, bracelet acier."
  "Montre élégante en or rose, cadran guilloché, bracelet alligator, édition limitée."
)

for i in {1..30}; do
  model=${montre_models[$((RANDOM % ${#montre_models[@]}))]}
  price=$(( (RANDOM % 9000 + 1000) * 1000 ))  # entre 1M et 9M FCFA
  stock=$((RANDOM % 20 + 1))
  featured=false
  if [ $featured_count -lt 15 ] && [ $((RANDOM % 3)) -eq 0 ]; then
    featured=true
    ((featured_count++))
  fi
  desc="Montre de la marque $model. ${montre_desc[$((RANDOM % ${#montre_desc[@]}))]}"
  name="$model - Réf. $(printf "MT%04d" $((RANDOM % 1000)))"

  echo -n "Création montre: $name... "
  pid=$(create_product "$name" "$desc" "$price" "$montres_id" "$stock" "$featured")
  if [ "$pid" != "0" ]; then
    echo -e "${GREEN}OK (id: $pid)${NC}"
    ((total++))
    # Ajouter des variations pour certaines montres
    if [ $((RANDOM % 5)) -eq 0 ]; then
      echo "  Ajout de variations pour montre $pid..."
      colors=("Or" "Argent" "Noir" "Bleu" "Or Rose")
      sizes=("S" "M" "L")
      for c in "${colors[@]:0:$((RANDOM % 3 + 1))}"; do
        s=${sizes[$((RANDOM % 3))]}
        vstock=$((RANDOM % 10 + 1))
        create_variation "$pid" "$c" "$s" "$vstock" && echo "    Variation $c/$s ajoutée"
      done
    fi
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

# --- Bijoux (environ 40) ---
bijoux_types=(
  "Bracelet" "Chaîne" "Collier" "Bague" "Boucles d'oreilles"
)
bijoux_materiaux=(
  "Or 18 carats" "Argent sterling" "Acier inoxydable" "Plaqué or" "Titane"
)

for i in {1..40}; do
  type=${bijoux_types[$((RANDOM % ${#bijoux_types[@]}))]}
  mat=${bijoux_materiaux[$((RANDOM % ${#bijoux_materiaux[@]}))]}
  price=$(( (RANDOM % 5000 + 500) * 1000 ))  # 500k à 5M FCFA
  stock=$((RANDOM % 30 + 5))
  featured=false
  desc="$type en $mat, finition soignée, fermoir sécurisé. Idéal pour cadeau."
  name="$type $mat - Modèle $(printf "BJ%04d" $((RANDOM % 1000)))"

  echo -n "Création bijou: $name... "
  pid=$(create_product "$name" "$desc" "$price" "$bijoux_id" "$stock" "$featured")
  if [ "$pid" != "0" ]; then
    echo -e "${GREEN}OK (id: $pid)${NC}"
    ((total++))
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

# --- Pochettes (environ 20) ---
pochette_styles=(
  "Pochette en cuir" "Pochette en daim" "Pochette en toile" "Pochette en satin"
)
for i in {1..20}; do
  style=${pochette_styles[$((RANDOM % ${#pochette_styles[@]}))]}
  price=$(( (RANDOM % 3000 + 200) * 1000 ))  # 200k à 3M FCFA
  stock=$((RANDOM % 20 + 2))
  featured=false
  desc="$style élégante, parfaite pour les soirées. Fermeture magnetique, anse amovible."
  name="Pochette $(printf "PC%04d" $((RANDOM % 1000))) - $style"

  echo -n "Création pochette: $name... "
  pid=$(create_product "$name" "$desc" "$price" "$pochettes_id" "$stock" "$featured")
  if [ "$pid" != "0" ]; then
    echo -e "${GREEN}OK (id: $pid)${NC}"
    ((total++))
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

# --- Gourdes (environ 15) ---
gourde_types=(
  "Gourde isotherme inox" "Gourde en verre" "Gourde en plastique recyclé" "Gourde pliable"
)
for i in {1..15}; do
  type=${gourde_types[$((RANDOM % ${#gourde_types[@]}))]}
  price=$(( (RANDOM % 500 + 100) * 1000 ))  # 100k à 500k FCFA
  stock=$((RANDOM % 50 + 10))
  featured=false
  desc="$type, capacité 500ml, maintient la température 12h, bouchon étanche."
  name="Gourde $(printf "GR%04d" $((RANDOM % 1000))) - $type"

  echo -n "Création gourde: $name... "
  pid=$(create_product "$name" "$desc" "$price" "$gourdes_id" "$stock" "$featured")
  if [ "$pid" != "0" ]; then
    echo -e "${GREEN}OK (id: $pid)${NC}"
    ((total++))
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

# --- Accessoires (environ 30) ---
accessoires_list=(
  "Porte-clés" "Lunettes de soleil" "Ceinture" "Gants" "Écharpe" "Chapeau" "Parapluie"
)
for i in {1..30}; do
  item=${accessoires_list[$((RANDOM % ${#accessoires_list[@]}))]}
  price=$(( (RANDOM % 2000 + 50) * 1000 ))  # 50k à 2M FCFA
  stock=$((RANDOM % 40 + 5))
  featured=false
  desc="$item de qualité supérieure, design moderne, finitions soignées."
  name="$item $(printf "AC%04d" $((RANDOM % 1000)))"

  echo -n "Création accessoire: $name... "
  pid=$(create_product "$name" "$desc" "$price" "$accessoires_id" "$stock" "$featured")
  if [ "$pid" != "0" ]; then
    echo -e "${GREEN}OK (id: $pid)${NC}"
    ((total++))
  else
    echo -e "${RED}ÉCHEC${NC}"
  fi
done

echo -e "\n${GREEN}=== Création terminée ===${NC}"
echo -e "Total produits créés: $total"
echo -e "Produits vedettes: $featured_count"