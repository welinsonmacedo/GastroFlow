const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix imports for types.ts
    // If it's in src/core/..., it needs '../../types'
    content = content.replace(/from\s+['"]\.\.\/types['"]/g, "from '../../types'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/types['"]/g, "from '../../../types'");

    // Fix imports for core/api/supabaseClient
    // If it's in src/core/..., it needs '../api/supabaseClient'
    content = content.replace(/from\s+['"]\.\.\/core\/api\/supabaseClient['"]/g, "from '../api/supabaseClient'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/core\/api\/supabaseClient['"]/g, "from '../../api/supabaseClient'");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${filePath}`);
    }
  }
});
