require('dotenv').config({ quiet: true });
const { spawn } = require('child_process');
const path = require('path');
const { resolveConfig } = require('../config/databaseConfig');

resolveConfig();

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('db:seed : définir ADMIN_EMAIL et ADMIN_PASSWORD (voir .env.example).');
  process.exit(1);
}

const script = path.join(__dirname, '../../create-admin.js');
const child = spawn(process.execPath, [script], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
