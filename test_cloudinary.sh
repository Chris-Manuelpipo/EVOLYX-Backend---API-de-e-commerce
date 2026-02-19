#!/bin/bash

# Configuration
BASE_URL="http://localhost:5000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "==================================="
echo "🔧 TEST CLOUDINARY INTÉGRATION"
echo "==================================="

# 1. Login
echo -e "\n📝 1. Login admin..."
TOKEN=$(curl -s -X POST $BASE_URL/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"password"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Échec login${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Token obtenu${NC}"

# 2. Créer un produit
echo -e "\n📝 2. Création d'un produit test..."
PRODUCT_RESPONSE=$(curl -s -X POST $BASE_URL/admin/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produit Test Cloudinary",
    "description": "Test integration Cloudinary",
    "base_price": 15000,
    "stock": 50,
    "category_id": 1
  }')

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo -e "${GREEN}✅ Produit créé avec ID: $PRODUCT_ID${NC}"

# 3. Upload d'image (si fichier existe)
echo -e "\n📝 3. Upload d'image vers Cloudinary..."
IMAGE_PATH="/home/chris-manuel/Téléchargements/test-image.jpg"

if [ -f "$IMAGE_PATH" ]; then
  UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/admin/products/$PRODUCT_ID/images \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@$IMAGE_PATH" \
    -F "is_main=true")
  
  echo $UPLOAD_RESPONSE | json_pp
  
  # Extraire l'URL Cloudinary
  CLOUDINARY_URL=$(echo $UPLOAD_RESPONSE | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$CLOUDINARY_URL" ]; then
    echo -e "${GREEN}✅ Image uploadée avec succès !${NC}"
    echo -e "📎 URL Cloudinary: $CLOUDINARY_URL"
  else
    echo -e "${RED}❌ Échec upload${NC}"
  fi
else
  echo -e "${RED}❌ Fichier image non trouvé: $IMAGE_PATH${NC}"
  echo "Créez une image test ou modifiez le chemin"
fi

# 4. Vérifier les images du produit
echo -e "\n📝 4. Récupération des images du produit..."
curl -s -X GET "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | json_pp

echo -e "\n==================================="
echo -e "${GREEN}✅ Test terminé${NC}"