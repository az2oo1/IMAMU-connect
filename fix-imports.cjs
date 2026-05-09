const fs = require('fs');

const tabs = [
  'src/pages/admin/ClubsTab.tsx',
  'src/pages/admin/CoursesTab.tsx',
  'src/pages/admin/NewsTab.tsx',
  'src/pages/admin/UsersTab.tsx'
];

tabs.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("import { TableSkeleton }")) {
      content = "import { TableSkeleton } from '../../components/TableSkeleton';\n" + content;
  }
  fs.writeFileSync(file, content);
});
