const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function assertCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const err = new Error('Configuration Cloudinary manquante sur le serveur');
    err.status = 503;
    throw err;
  }
}

function uploadImageBuffer(buffer, originalname = 'image') {
  assertCloudinaryConfig();
  const base = String(originalname || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'evolyx/products',
        public_id: `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        resource_type: 'image',
        format: 'webp',
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
      },
      (err, result) => {
        if (err) {
          err.status = 502;
          reject(err);
          return;
        }
        resolve({
          url: result.secure_url || result.url,
          public_id: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadImageBuffer,
  assertCloudinaryConfig,
};
