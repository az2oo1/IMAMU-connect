const fs = require('fs');
let content = fs.readFileSync('src/pages/ManageClub.tsx', 'utf-8');

// 1. Add Roles button to Quick Actions
content = content.replace(
`className="grid grid-cols-1 sm:grid-cols-4 gap-4"`,
`className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"`
);

content = content.replace(
`                  <button 
                    onClick={() => setActiveTab('members')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Members</span>
                  </button>`,
`                  <button 
                    onClick={() => setActiveTab('members')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Members</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('roles')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Roles</span>
                  </button>`
);

// 2. State for Roles
const rolesStates = `
  // Roles State
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const PERMISSIONS = [
    { id: 'manage_settings', label: 'Manage Settings' },
    { id: 'manage_news', label: 'Manage Articles' },
    { id: 'manage_members', label: 'Manage Members' },
    { id: 'manage_forms', label: 'Manage Forms' }
  ];
`;
content = content.replace(
  `// Edit Modal State`,
  `${rolesStates}\n  // Edit Modal State`
);

// 3. Handling Role Save
const handleRoleFunc = `
  const handleSaveRole = async () => {
    try {
      const url = editingRole 
        ? \`/api/clubs/\${id}/roles/\${editingRole.id}\`
        : \`/api/clubs/\${id}/roles\`;
      const method = editingRole ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${localStorage.getItem('token')}\` },
        body: JSON.stringify({ name: roleName, permissions: rolePerms })
      });
      if (res.ok) {
        const data = await res.json();
        if (editingRole) {
          setClub({ ...club, roles: club.roles.map((r: any) => r.id === editingRole.id ? data.role : r) });
        } else {
          setClub({ ...club, roles: [...(club.roles || []), data.role] });
        }
        setEditingRole(null);
        setRoleName('');
        setRolePerms([]);
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      const res = await fetch(\`/api/clubs/\${id}/roles/\${roleId}\`, {
        method: 'DELETE',
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (res.ok) {
        setClub({ ...club, roles: club.roles.filter((r: any) => r.id !== roleId) });
      }
    } catch (e) {
      console.error(e);
    }
  };
`;
content = content.replace(
  `const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {`,
  `${handleRoleFunc}\n\n  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {`
);

// 4. Render Roles Tab
const rolesTabCode = `
          {activeTab === 'roles' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Club Roles</h3>
                  <p className="text-neutral-400">Create custom roles and assign them specific permissions.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {(!club?.roles || club.roles.length === 0) && (
                    <div className="text-center py-12 bg-neutral-900 rounded-2xl border border-neutral-800">
                      <p className="text-neutral-500">No custom roles created yet.</p>
                    </div>
                  )}
                  {club?.roles?.map((role: any) => (
                    <div key={role.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition-colors">
                      <div>
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          {role.name}
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-xs font-medium border border-neutral-700/50">
                            {role.permissions?.length || 0} Permissions
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {role.permissions?.map((p: string) => (
                            <span key={p} className="px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-[10px] font-bold uppercase tracking-wider">
                              {p.replace('manage_', '')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setRoleName(role.name);
                            setRolePerms(role.permissions || []);
                          }}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-fit sticky top-6">
                  <h4 className="text-lg font-bold text-white mb-4">
                    {editingRole ? 'Edit Role' : 'Create New Role'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Role Name</label>
                      <input 
                        type="text" 
                        value={roleName}
                        onChange={e => setRoleName(e.target.value)}
                        placeholder="e.g. Content Manager"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Permissions</label>
                      <div className="space-y-2">
                        {PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={rolePerms.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setRolePerms([...rolePerms, p.id]);
                                else setRolePerms(rolePerms.filter(x => x !== p.id));
                              }}
                              className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500/50 bg-neutral-900 border-neutral-700"
                            />
                            <span className="text-sm text-neutral-300 font-medium">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                      {editingRole && (
                        <button 
                          onClick={() => { setEditingRole(null); setRoleName(''); setRolePerms([]); }}
                          className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSaveRole}
                        disabled={!roleName.trim()}
                        className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                      >
                        {editingRole ? 'Save Changes' : 'Create Role'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
`;
content = content.replace(
  `{activeTab === 'members' && (`,
  `${rolesTabCode}\n\n          {activeTab === 'members' && (`
);

// 5. Update the Member Management Modal to use Role Dropdown
const roleDropdownStr = `
                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Club Role</div>
                  <select 
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer appearance-none"
                    value={selectedMemberForInfo.roleId || ''}
                    onChange={async (e) => {
                      const roleId = e.target.value === '' ? null : e.target.value;
                      setSelectedMemberForInfo({...selectedMemberForInfo, roleId});
                      try {
                        const res = await fetch(\`/api/clubs/\${id}/members/\${selectedMemberForInfo.userId}/role\`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: \`Bearer \${localStorage.getItem('token')}\`
                          },
                          body: JSON.stringify({ roleId })
                        });
                        if (res.ok) {
                          setMembers(members.map(m => m.id === selectedMemberForInfo.id ? { ...m, roleId, role: club?.roles?.find((r: any) => r.id === roleId) } : m));
                        }
                      } catch (err) {}
                    }}
                  >
                    <option value="">No Role</option>
                    {club?.roles?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
`;
content = content.replace(
  `<div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Club Role</div>
                  <input 
                    type="text" 
                    className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-neutral-600"
                    placeholder="e.g. President, Member..."
                    value={selectedMemberForInfo.roleTitle || ''}
                    onChange={async (e) => {
                      const title = e.target.value;
                      setSelectedMemberForInfo({...selectedMemberForInfo, roleTitle: title});
                      try {
                        await fetch(\`/api/clubs/\${id}/members/\${selectedMemberForInfo.userId}/role\`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: \`Bearer \${localStorage.getItem('token')}\`
                          },
                          body: JSON.stringify({ roleTitle: title })
                        });
                        setMembers(members.map(m => m.id === selectedMemberForInfo.id ? { ...m, roleTitle: title } : m));
                      } catch (err) {}
                    }}
                  />
                </div>`,
  roleDropdownStr
);

// 6. Update role pill display in Members list
content = content.replace(
  `{member.roleTitle && !member.isAdmin && (
                                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-medium tracking-wide">
                                  {member.roleTitle}
                                </span>
                              )}`,
  `{(member.role?.name || member.roleTitle) && !member.isAdmin && (
                                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-medium tracking-wide border border-neutral-700/50 shadow-sm">
                                  {member.role?.name || member.roleTitle}
                                </span>
                              )}`
);

fs.writeFileSync('src/pages/ManageClub.tsx', content);
console.log('manage club patched');
