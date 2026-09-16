// debug-upload.js
const cloudinary = require('cloudinary').v2;
require('./src/config/loadEnv');

console.log('🔍 Vérification configuration Cloudinary:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅' : '❌');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅' : '❌');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test simple d'upload
async function testUpload() {
  try {
    const result = await cloudinary.uploader.upload('/tmp/test.jpg', {
      folder: 'test'
    });
    console.log('✅ Upload réussi:', result.secure_url);
  } catch (error) {
    console.error('❌ Erreur Cloudinary:', error);
  }
}

testUpload();