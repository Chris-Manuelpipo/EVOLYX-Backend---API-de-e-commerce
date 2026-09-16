const bcrypt = require('bcryptjs');

const password = process.env.ADMIN_PASSWORD || process.argv[2];
if (!password) {
  console.error('Usage: ADMIN_PASSWORD=... node gethash.js');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
