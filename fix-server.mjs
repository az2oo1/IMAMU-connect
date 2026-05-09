import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/bio: true, /g, 'bio: true, happiness: true, ');
content = content.replace(/bio: true \}/g, 'bio: true, happiness: true }');
content = content.replace(/bio: true\n/g, 'bio: true,\nhappiness: true,\n');
fs.writeFileSync('server.ts', content);
