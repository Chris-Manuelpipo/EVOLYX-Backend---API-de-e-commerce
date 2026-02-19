// Créez un fichier temporaire: scripts/create-admin.js
const bcrypt = require('bcrypt');
const db = require('./src/config/database'); // Ajustez le chemin

async function createNewAdmin() {
  try {
    const email = 'evolyxcmr@gmail.com';
    const password = 'mbalach';
    const role = 'super_admin';

    // Hasher le mot de passe (comme dans votre controller)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Supprimer l'ancien admin (optionnel)
    await db.query(`DELETE FROM admins WHERE email = 'admin@email.com'`);

    // Créer le nouvel admin
    const result = await db.query(
      `INSERT INTO admins(email, password, role)
       VALUES($1, $2, $3)
       RETURNING id, email, role`,
      [email, hashedPassword, role]
    );

    console.log('✅ Nouvel admin créé avec succès !');
    console.log('📧 Email:', result.rows[0].email);
    console.log('👤 Rôle:', result.rows[0].role);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
} 

createNewAdmin();