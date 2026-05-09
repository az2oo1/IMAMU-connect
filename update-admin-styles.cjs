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

  // Replace main card container wrapper:
  content = content.replace(/bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl/g, 
    'border border-neutral-800 bg-neutral-950/40 rounded-xl overflow-hidden');

  // Replace form/create cards:
  content = content.replace(/bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl/g,
    'border border-neutral-800 bg-neutral-950/40 rounded-xl p-6');
    
  // Replace table headers
  content = content.replace(/border-b border-neutral-800 bg-neutral-950\/50/g,
    'border-b border-neutral-800 bg-neutral-900/40 text-xs uppercase tracking-wider text-neutral-500');

  // Update inputs
  content = content.replace(/bg-neutral-950 border border-neutral-800 rounded-xl/g,
    'bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm');
    
  // Sub-header styling (where Search is)
  content = content.replace(/p-4 border-b border-neutral-800 flex items-center gap-4/g,
    'p-3 border-b border-neutral-800 flex items-center gap-3 bg-neutral-900/20');

  fs.writeFileSync(file, content);
});

console.log('Admin styles updated!');
