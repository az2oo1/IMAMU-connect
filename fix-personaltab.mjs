import fs from 'fs';
let content = fs.readFileSync('src/pages/PersonalTab.tsx', 'utf8');
content = content.replace(/.*const \[editHappiness.*/g, '');
content = content.replace(/.*happiness: editHappiness,.*/g, '');
content = content.replace(/.*setEditHappiness.*/g, '');
// and remove the rendered happiness block length
const happInd = content.indexOf('{(user.happiness');
if (happInd !== -1) {
    const endInd = content.indexOf(')}', happInd) + 2;
    content = content.substring(0, happInd) + content.substring(endInd);
}

const editHappInd = content.indexOf('<label className="block text-sm font-medium text-neutral-300 mb-1">Happiness</label>');
if (editHappInd !== -1) {
    const startDiv = content.lastIndexOf('<div>', editHappInd);
    const endDiv = content.indexOf('</div>\n                  <div>', editHappInd) + 6;
    content = content.substring(0, startDiv) + content.substring(endDiv);
}

content = content.replace(/\n\s*\n/g, '\n'); // remove empty lines
fs.writeFileSync('src/pages/PersonalTab.tsx', content);
