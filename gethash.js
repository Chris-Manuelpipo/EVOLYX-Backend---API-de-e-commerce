const bcrypt = require('bcrypt');
const password = 'mbalach'; // ton mot de passe
const hash = bcrypt.hashSync(password, 10);
console.log(hash);

//$2b$10$7ZtsNrTs3QIWOmTiH6SxZ.M79desFsJjE52CuKo0oTF52bGx5YFgm
