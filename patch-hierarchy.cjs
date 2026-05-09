const fs = require('fs');
let content = fs.readFileSync('src/components/ClubHierarchy.tsx', 'utf-8');

// Add role field into Member interface
concontent = content.replace(
  `  roleTitle: string | null;`,
  `  roleTitle: string | null;
  roleId?: string | null;
  role?: any;`
);

// We need to fetch roles inside ClubHierarchy.tsx. Wait, or we can just fetch it inside the component.
const fetchRolesStr = `
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    if (!isReadOnly && clubId) {
      fetch(\`/api/clubs/\${clubId}/roles\`, {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      }).then(r => r.ok ? r.json() : { roles: [] }).then(d => setRoles(d.roles)).catch(() => {});
    }
  }, [clubId, isReadOnly]);
`;
content = content.replace(
  `const [error, setError] = useState('');`,
  `const [error, setError] = useState('');\n${fetchRolesStr}`
);

// Replace the UI where the roleTitle is set
const dropdownStr = `
                      <div className="flex justify-between items-center bg-neutral-800 p-2 rounded-lg">
                        <span className="text-sm text-neutral-400">Club Role</span>
                        <select 
                          className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-primary-500"
                          value={selectedMemberForModal.roleId || ''}
                          onChange={(e) => updateMemberRoleTitle(e.target.value === '' ? null : e.target.value)}
                        >
                          <option value="">No Role</option>
                          {roles?.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
`;
// Wait, I need to check exactly how it was updated.
// updateMemberRoleTitle takes a string title.
// Actually, I can just replace the input rendering.
content = content.replace(
`                      <div className="flex justify-between items-center bg-neutral-800 p-2 rounded-lg">
                        <span className="text-sm text-neutral-400">Role Title</span>
                        {isReadOnly ? (
                          <p className="text-neutral-200 font-medium">{selectedMemberForModal.roleTitle || (selectedMemberForModal.isAdmin ? 'Admin' : 'Member')}</p>
                        ) : (
                          <input 
                            type="text"
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-white w-32 focus:outline-none focus:border-primary-500"
                            placeholder="e.g. Vice President"
                            value={selectedMemberForModal.roleTitle || ''}
                            onChange={(e) => updateMemberRoleTitle(e.target.value)}
                          />
                        )}
                      </div>`,
`                      <div className="flex justify-between items-center bg-neutral-800 p-2 rounded-lg">
                        <span className="text-sm text-neutral-400">Role</span>
                        {isReadOnly ? (
                          <p className="text-neutral-200 font-medium">{selectedMemberForModal.role?.name || selectedMemberForModal.roleTitle || (selectedMemberForModal.isAdmin ? 'Admin' : 'Member')}</p>
                        ) : (
                          <select 
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-sm text-white w-32 focus:outline-none focus:border-primary-500"
                            value={selectedMemberForModal.roleId || ''}
                            onChange={(e) => updateMemberRoleTitle(e.target.value === '' ? null : e.target.value)}
                          >
                            <option value="">No Role</option>
                            {roles?.map((r: any) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        )}
                      </div>`
);

// Update updateMemberRoleTitle logic
content = content.replace(
`  const updateMemberRoleTitle = async (title: string) => {
    if (!selectedMemberForModal) return;
    try {
      await fetch(\`/api/clubs/\${clubId}/members/\${selectedMemberForModal.userId}/role\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${localStorage.getItem('token')}\`
        },
        body: JSON.stringify({ roleTitle: title })
      });
      setMembers(members.map(m => m.id === selectedMemberForModal.id ? { ...m, roleTitle: title } : m));
      setSelectedMemberForModal({ ...selectedMemberForModal, roleTitle: title });
    } catch (e) {
      console.error(e);
    }
  };`,
`  const updateMemberRoleTitle = async (roleId: string | null) => {
    if (!selectedMemberForModal) return;
    try {
      await fetch(\`/api/clubs/\${clubId}/members/\${selectedMemberForModal.userId}/role\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${localStorage.getItem('token')}\`
        },
        body: JSON.stringify({ roleId })
      });
      const selectedRole = roles.find(r => r.id === roleId);
      setMembers(members.map(m => m.id === selectedMemberForModal.id ? { ...m, roleId, role: selectedRole } : m));
      setSelectedMemberForModal({ ...selectedMemberForModal, roleId, role: selectedRole });
    } catch (e) {
      console.error(e);
    }
  };`
);

content = content.replace(
`<p className="text-xs text-primary-400 font-medium truncate">{member.roleTitle || (member.isAdmin ? 'Role: Admin' : 'Member')}</p>`,
`<p className="text-xs text-primary-400 font-medium truncate">{member.role?.name || member.roleTitle || (member.isAdmin ? 'Role: Admin' : 'Member')}</p>`
);
content = content.replace(
`<p className="text-[10px] text-primary-400 truncate">{child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>`,
`<p className="text-[10px] text-primary-400 truncate">{child.role?.name || child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>`
);
content = content.replace(
`<p className="text-[10px] text-primary-400 truncate">{child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>`,
`<p className="text-[10px] text-primary-400 truncate">{child.role?.name || child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>`
);

fs.writeFileSync('src/components/ClubHierarchy.tsx', content);
console.log('patched');
