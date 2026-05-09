const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, filesList);
    } else if (name.endsWith('.tsx')) {
      filesList.push(name);
    }
  }
  return filesList;
}

const files = getFiles('src/pages/admin');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');

  let updated = false;

  if (content.match(/<td colSpan=\{[0-9]+\} className="p-8 text-center text-neutral-500">Loading [a-zA-Z]+...<\/td>/)) {
    content = content.replace(
      /<tr>\s*<td colSpan=\{[0-9]+\} className="p-8 text-center text-neutral-500">Loading [a-zA-Z]+...<\/td>\s*<\/tr>/,
      '<TableSkeleton />'
    );
    if (!content.includes('TableSkeleton')) {
        content = content.replace("import React", "import { TableSkeleton } from '../../components/TableSkeleton';\nimport React");
    }
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
  }
});

console.log('Admin loaders updated!');
