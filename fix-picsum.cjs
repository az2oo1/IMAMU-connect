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

    // Pattern 1: || `https://picsum...`
    content = content.replace(/ \|\| `https:\/\/picsum\.photos\/seed\/[^`]+`/g, '');
    
    // Pattern 2: || 'https://picsum...'
    content = content.replace(/ \|\| 'https:\/\/picsum\.photos\/seed\/[^']+'/g, '');
    
    // Pattern 3: : `https://picsum...` (for ternaries)
    // Be careful with ternaries, we might just want to replace with null
    content = content.replace(/: `https:\/\/picsum\.photos\/seed\/[^`]+`/g, ': null');
    content = content.replace(/: 'https:\/\/picsum\.photos\/seed\/[^']+'/g, ': null');

    // Pattern 4: avatar: `https://picsum...`
    content = content.replace(/avatar: `https:\/\/picsum\.photos\/seed\/[^`]+`/g, 'avatar: null');
    content = content.replace(/image: `https:\/\/picsum\.photos\/seed\/[^`]+`/g, 'image: null');
    content = content.replace(/banner: `https:\/\/picsum\.photos\/seed\/[^`]+`/g, 'banner: null');

    content = content.replace(/avatar: 'https:\/\/picsum\.photos\/seed\/[^']+'/g, 'avatar: null');
    content = content.replace(/image: 'https:\/\/picsum\.photos\/seed\/[^']+'/g, 'image: null');
    content = content.replace(/banner: 'https:\/\/picsum\.photos\/seed\/[^']+'/g, 'banner: null');
    content = content.replace(/logo: 'https:\/\/picsum\.photos\/seed\/[^']+'/g, 'logo: null');
    
    content = content.replace(/src=\{`https:\/\/picsum\.photos\/seed\/[^`]+`\}/g, 'src={null}');
    content = content.replace(/src=\{'https:\/\/picsum\.photos\/seed\/[^']+'\}/g, 'src={null}');

    // Pattern 5: article.authorAvatar ... || picsum
    // Our first pass covers || `https://picsum...` but let's double check.

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
