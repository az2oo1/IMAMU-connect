import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminLayout.tsx', 'utf-8');

content = content.replace(/from '\.\.\/ThemeContext'/g, "from '../../ThemeContext'");
content = content.replace(/from '\.\.\/contexts\/UserContext'/g, "from '../../contexts/UserContext'");
content = content.replace(/from '\.\.\/contexts\/SocketContext'/g, "from '../../contexts/SocketContext'");
content = content.replace(/from '\.\/AuthModal'/g, "from '../../components/AuthModal'");
content = content.replace(/from '\.\/OptimizedImage'/g, "from '../../components/OptimizedImage'");
content = content.replace(/from '\.\/GlobalSearchModal'/g, "from '../../components/GlobalSearchModal'");

fs.writeFileSync('src/pages/admin/AdminLayout.tsx', content);
console.log('Fixed imports in AdminLayout');
