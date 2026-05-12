const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/image: "https:\/\/picsum\.photos\/seed\/[^"]+"/g, 'image: null');
    content = content.replace(/authorAvatar: "https:\/\/picsum\.photos\/seed\/[^"]+"/g, 'authorAvatar: null');
    content = content.replace(/: \[`https:\/\/picsum\.photos\/seed\/[^`]+`\]/g, ': []');

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
