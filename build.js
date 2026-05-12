const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'public', 'config.js');
const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';

fs.writeFileSync(out, `window.APP_CONFIG = {\n  SUPABASE_URL: ${JSON.stringify(url)},\n  SUPABASE_ANON_KEY: ${JSON.stringify(anon)}\n};\n`);
console.log('config.js created');
