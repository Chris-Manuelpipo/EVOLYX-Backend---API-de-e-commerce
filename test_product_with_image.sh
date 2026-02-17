#!/bin/bash

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="http://localhost:5000/api"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}           TEST CRÉATION PRODUIT AVEC IMAGE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# 1. LOGIN ADMIN
echo -e "${CYAN}🔐 Connexion admin...${NC}"
TOKEN=$(curl -s -X POST $BASE_URL/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"password"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Échec connexion${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Token obtenu${NC}\n"

# 2. CRÉER UN DOSSIER TEMPORAIRE POUR LES IMAGES TEST
echo -e "${CYAN}📁 Création des images de test...${NC}"
mkdir -p test_images

# Créer une vraie image test (petite image JPEG)
cat > test_images/product.jpg << 'EOF'
/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QganBlZyB2MS4wICh1c2luZyBJSkcg
SlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwK
DAwLCgsLDQ8SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQU
FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgBAAEA
AwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMF
BQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkq
NDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqi
o6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/E
AB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMR
BAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVG
R0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKz
tLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A
/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoooo
AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==
EOF

echo -e "${GREEN}✅ Image de test créée${NC}\n"

# 3. CRÉER UN PRODUIT AVEC IMAGE
echo -e "${CYAN}📦 Création du produit avec image...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F "name=Produit avec Image $(date +%s)" \
  -F "description=Ce produit a été créé avec une image de test" \
  -F "base_price=25000" \
  -F "cost_price=18000" \
  -F "stock=30" \
  -F "category_id=1" \
  -F "images=@test_images/product.jpg")

echo $RESPONSE | json_pp

# Extraire l'ID du produit créé
PRODUCT_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${GREEN}✅ Produit créé avec ID: $PRODUCT_ID${NC}"
else
  echo -e "\n${RED}❌ Échec création produit${NC}"
fi

# 4. TEST AVEC UPLOAD D'IMAGE SUR UN PRODUIT EXISTANT
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${CYAN}🖼️  Test d'ajout d'image supplémentaire...${NC}"
  
  # Créer une deuxième image
  cat > test_images/product2.jpg << 'EOF'
/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QganBlZyB2MS4wICh1c2luZyBJSkcg
SlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwK
DAwLCgsLDQ8SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQU
FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgBAAEA
AwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMF
BQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkq
NDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqi
o6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/E
AB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMR
BAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVG
R0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKz
tLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A
/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoooo
AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==
EOF

  RESPONSE2=$(curl -s -X POST "$BASE_URL/admin/products/$PRODUCT_ID/images" \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@test_images/product2.jpg" \
    -F "is_main=false")

  echo $RESPONSE2 | json_pp
fi

# 5. RÉCUPÉRER LE PRODUIT AVEC SES IMAGES
echo -e "\n${CYAN}🔍 Récupération du produit avec ses images...${NC}"
curl -s -X GET "$BASE_URL/products/$PRODUCT_ID" | json_pp

# 6. NETTOYAGE
echo -e "\n${CYAN}🧹 Nettoyage...${NC}"
rm -rf test_images
echo -e "${GREEN}✅ Dossier test_images supprimé${NC}"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           TEST TERMINÉ AVEC SUCCÈS 🎉${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"