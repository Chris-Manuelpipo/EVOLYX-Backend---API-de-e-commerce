// server.js - juste pour démarrer
const dotenv = require('dotenv');
const listEndpoints = require('express-list-endpoints');
dotenv.config();

const app = require('./src/app'); // ← Importer l'app configurée
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(listEndpoints(app));
});

