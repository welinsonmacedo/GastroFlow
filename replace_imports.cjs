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

    // Replace lib/supabase
    content = content.replace(/from\s+['"](?:\.\.\/)+lib\/supabase['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/api/supabaseClient'`;
    });
    content = content.replace(/from\s+['"]\.\/lib\/supabase['"]/g, "from './core/api/supabaseClient'");

    // Replace utils/formatters
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/formatters['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/utils/formatters'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/formatters['"]/g, "from './core/utils/formatters'");

    // Replace utils/currency
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/currency['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/utils/currency'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/currency['"]/g, "from './core/utils/currency'");

    // Replace utils/tenant
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/tenant['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/tenant/tenantResolver'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/tenant['"]/g, "from './core/tenant/tenantResolver'");

    // Replace utils/security
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/security['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/security/security'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/security['"]/g, "from './core/security/security'");

    // Replace utils/printHelper
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/printHelper['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/print/printHelper'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/printHelper['"]/g, "from './core/print/printHelper'");

    // Replace utils/printContract
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/printContract['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/print/printContract'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/printContract['"]/g, "from './core/print/printContract'");

    // Replace utils/printStaffSheet
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/printStaffSheet['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/print/printStaffSheet'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/printStaffSheet['"]/g, "from './core/print/printStaffSheet'");

    // Replace utils/audio
    content = content.replace(/from\s+['"](?:\.\.\/)+utils\/audio['"]/g, (match) => {
      const depth = match.match(/\.\.\//g).length;
      const prefix = '../'.repeat(depth);
      return `from '${prefix}core/audio/audio'`;
    });
    content = content.replace(/from\s+['"]\.\/utils\/audio['"]/g, "from './core/audio/audio'");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
