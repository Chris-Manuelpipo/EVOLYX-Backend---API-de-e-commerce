const path = require('path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '../..');

dotenv.config({
  path: [path.join(root, '.env.local'), path.join(root, '.env')],
  quiet: true,
});
