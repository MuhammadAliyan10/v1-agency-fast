const fs = require('fs');
const path = require('path');

const TARGET_DIRS = ['app', 'components'];
const REGEX = /\brounded-(sm|md|lg|xl|2xl|3xl|full|t-[a-z0-9]+|b-[a-z0-9]+|l-[a-z0-9]+|r-[a-z0-9]+)\b/g;

function isExempt(filePath) {
  // Exempt avatar component
  if (filePath.includes('avatar.tsx')) return true;
  return false;
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css'))) {
      if (isExempt(fullPath)) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      if (REGEX.test(content)) {
        // Special case: rounded-full might be used for badge dots or status indicators.
        // Let's blindly remove all of them as requested except avatar.
        // But wait, the user said "Buttons, cards, dialogs, and inputs must be strictly sharp."
        // We will remove all.
        const newContent = content.replace(REGEX, '').replace(/\s+/g, ' '); 
        // using replace(/\s+/g, ' ') might break code indentation!
        // Instead:
        let result = content.replace(/\brounded-(sm|md|lg|xl|2xl|3xl|full|t-[a-z0-9]+|b-[a-z0-9]+|l-[a-z0-9]+|r-[a-z0-9]+)\b/g, '');
        // Clean up double spaces in classNames
        result = result.replace(/className=(["'])(.*?)\1/g, (match, quote, classStr) => {
             return `className=${quote}${classStr.replace(/\s+/g, ' ').trim()}${quote}`;
        });
        
        fs.writeFileSync(fullPath, result, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

TARGET_DIRS.forEach(dir => processDirectory(path.join(__dirname, dir)));
console.log('Purge complete');
