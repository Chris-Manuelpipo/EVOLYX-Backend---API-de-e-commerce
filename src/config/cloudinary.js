const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let storage;

function getStorage() {
  if (storage) return storage;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
      const base = String(file.originalname || 'image')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40) || 'image';
      return {
        folder: 'evolyx/products',
        public_id: `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
        format: 'webp',
      };
    },
  });
  return storage;
}

module.exports = {
  cloudinary,
  get storage() {
    return getStorage();
  },
};
