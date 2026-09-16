require('./src/config/loadEnv');
const bcrypt = require('bcrypt');
const db = require('./src/config/database');

async function createNewAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const role = process.env.ADMIN_ROLE || 'super_admin';

    if (!email || !password) {
      console.error('Définir ADMIN_EMAIL et ADMIN_PASSWORD (voir .env.example).');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const existing = await db.query(
      `SELECT id FROM admins WHERE email = $1`,
      [email]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await db.query(
        `UPDATE admins SET password = $1, role = $2 WHERE email = $3
         RETURNING id, email, role`,
        [hashedPassword, role, email]
      );
    } else {
      result = await db.query(
        `INSERT INTO admins(email, password, role)
         VALUES($1, $2, $3)
         RETURNING id, email, role`,
        [email, hashedPassword, role]
      );
    }

    console.log('Admin créé ou mis à jour.');
    console.log('Email:', result.rows[0].email);
    console.log('Rôle:', result.rows[0].role);

    process.exit(0);
  } catch (error) {
    console.error('Erreur création admin:', error.message);
    process.exit(1);
  }
}

createNewAdmin();
