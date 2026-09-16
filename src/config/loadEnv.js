const path = require('path');

try {
  const dotenv = require('dotenv');
  const root = path.resolve(__dirname, '../..');
  dotenv.config({ path: path.join(root, '.env.local'), quiet: true });
  dotenv.config({ path: path.join(root, '.env'), quiet: true });
} catch {
  // Sur Vercel les variables viennent du dashboard ; dotenv est optionnel.
}
