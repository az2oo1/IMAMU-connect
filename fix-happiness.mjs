import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/, happiness: true/g, '');
content = content.replace(/happiness: true,/g, '');
content = content.replace(/happiness: true /g, '');
content = content.replace(/happiness: true\n/g, '');
content = content.replace(/happiness: editHappiness,/g, '');
fs.writeFileSync('server.ts', content);

let userCtx = fs.readFileSync('src/contexts/UserContext.tsx', 'utf8');
userCtx = userCtx.replace(/happiness\?: number;/g, '');
userCtx = userCtx.replace(/happiness\?: number; /g, '');
fs.writeFileSync('src/contexts/UserContext.tsx', userCtx);
