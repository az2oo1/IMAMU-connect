const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/ReportsTab.tsx', 'utf-8');

const targetStr = `         </div>
       </div>`;

const replaceStr = `         </div>
        <AdminPagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalItems={totalItems} 
          itemsPerPage={LIMIT} 
          onPageChange={setPage} 
        />
       </div>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/pages/admin/ReportsTab.tsx', content);
console.log('Fixed ReportsTab!');
