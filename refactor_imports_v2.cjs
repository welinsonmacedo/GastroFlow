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

    // Replace context imports
    content = content.replace(/from\s+['"](?:\.\.\/)+(?:context|services|hooks)\/([^'"]+)['"]/g, (match, p1) => {
        // This is a bit simplistic, might need refinement
        // Assuming the structure is now @/core/context/...
        // The regex captures the rest of the path
        const type = match.match(/(context|services|hooks)/)[1];
        return `from '@/core/${type}/${p1}'`;
    });
    
    // Also handle direct imports like './context/...'
    content = content.replace(/from\s+['"]\.\/(context|services|hooks)\/([^'"]+)['"]/g, "from '@/core/$1/$2'");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
