import fs from 'fs';
import path from 'path';

function findFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = findFiles(path.resolve('./src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    content = content.replace(/alert\(/g, 'toast(');
    if (!content.includes("from 'sonner'") && !content.includes('from "sonner"')) {
      content = `import { toast } from 'sonner';\n` + content;
    }
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
