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

    // Fix imports that are now incorrect
    // Replace '../core/core/' with '@/core/'
    content = content.replace(/from\s+['"]\.\.\/core\/core\//g, "from '@/core/");
    
    // Replace '../core/' with '@/core/'
    content = content.replace(/from\s+['"]\.\.\/core\//g, "from '@/core/");

    // Replace '../../core/' with '@/core/'
    content = content.replace(/from\s+['"]\.\.\/\.\.\/core\//g, "from '@/core/");

    // Replace '../../../core/' with '@/core/'
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/core\//g, "from '@/core/");

    // Replace '../../../..' with '@/core/' if it points to core
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/core\//g, "from '@/core/");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${filePath}`);
    }
  }
});
