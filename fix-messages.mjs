import fs from 'fs';

let content = fs.readFileSync('src/pages/MessagesTab.tsx', 'utf-8');

const mapStartStr = '{displayedMessages.filter((m: any) => !m.deletedForMe).map((msg: any, index: number, arr: any[]) => {';
const mapStart = content.indexOf(mapStartStr);
const mapEndStr = '              <div ref={messagesEndRef} />';
const mapEnd = content.indexOf(mapEndStr);

if (mapStart === -1 || mapEnd === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const mapContent = content.substring(mapStart, mapEnd);

// Find where to insert useMemo
const returnStart = content.indexOf('  return (\n    <motion.div');
if (returnStart === -1) {
    console.error("Could not find return statement");
    process.exit(1);
}

let mapBody = mapContent.trim();
// Remove `{` and `}` wrapper
if (mapBody.startsWith('{')) mapBody = mapBody.substring(1);
if (mapBody.endsWith('}')) mapBody = mapBody.substring(0, mapBody.length - 1);

let memoBlock = `  const renderedMessages = useMemo(() => {
    return ` + mapBody + `;
  }, [
    displayedMessages,
    user?.id,
    user?.username,
    activeMessageOptions?.id,
    replyingTo?.id // Re-render when replies or options change
  ]);

`;

// replace the map in the JSX with {renderedMessages}
content = content.substring(0, mapStart) + '              {renderedMessages}\n' + content.substring(mapEnd);

// insert useMemo before return
content = content.substring(0, returnStart) + memoBlock + content.substring(returnStart);

// add useMemo to React import if it's not there
if (content.indexOf('useMemo') === -1) {
    content = content.replace('useState, useEffect, useRef', 'useState, useEffect, useRef, useMemo');
}

fs.writeFileSync('src/pages/MessagesTab.tsx', content);
console.log("MessagesTab successfully modified!");
