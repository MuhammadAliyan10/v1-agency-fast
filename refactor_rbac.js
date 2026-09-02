const fs = require('fs');
const path = require('path');

const ACTIONS_DIR = path.join(__dirname, 'server/actions');

const mapping = {
  'requireManagerPermission("canManageMenu")': 'requireManagerPermission("menu", "update")',
  'requireManagerPermission("canViewFinance")': 'requireManagerPermission("finance", "read")',
  'requireManagerPermission("canManageCoupons")': 'requireManagerPermission("coupons", "update")',
  'requireManagerPermission("canViewInventory")': 'requireManagerPermission("inventory", "read")',
  'requireManagerPermission("canBroadcastWhatsapp")': 'requireManagerPermission("whatsapp", "create")',
  'requireManagerPermission("canManageStaff")': 'requireManagerPermission("staff", "update")',
  'requireManagerPermission("canUpdateOrders")': 'requireManagerPermission("orders", "update")',
  'requireManagerPermission("canCancelOrders")': 'requireManagerPermission("orders", "delete")',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [oldStr, newStr] of Object.entries(mapping)) {
        if (content.includes(oldStr)) {
          content = content.replaceAll(oldStr, newStr);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDirectory(ACTIONS_DIR);
console.log('Refactoring complete.');
