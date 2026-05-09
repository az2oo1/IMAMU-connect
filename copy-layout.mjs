import fs from 'fs';

let layoutContent = fs.readFileSync('src/components/Layout.tsx', 'utf-8');

// Copy Layout.tsx content, and modify it to be AdminLayout
let adminLayoutContent = layoutContent.replace(/export default function Layout\(\) {/g, 'export default function AdminLayout() {');

// We need to change ALL_NAV_ITEMS
const adminNavItems = `
  const ALL_NAV_ITEMS = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/roles', icon: Users, label: 'Roles' }, // we don't import Network, so fallback to Users or import it
    { to: '/admin/clubs', icon: Tent, label: 'Clubs' }, // Tent is used for Clubs
    { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
    { to: '/admin/news', icon: Newspaper, label: 'News' },
    { to: '/admin/reports', icon: Shield, label: 'Reports' }, // AlertTriangle -> Shield
  ];
`;

adminLayoutContent = adminLayoutContent.replace(/const ALL_NAV_ITEMS = \[[\s\S]*?\];/, adminNavItems.trim());

// For handleBackup and checkAdminStatus
const newUseEffect = `
  const location = useLocation();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        if (location.pathname !== '/admin/login') {
          navigate('/admin/login');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: \`Bearer \${token}\` }
        });
        if (res.ok) {
          const data = await res.json();
          const isAdminEmail = data.user.studentEmail === 'abdulazizalgassem4@gmail.com' || data.user.googleEmail === 'abdulazizalgassem4@gmail.com';
          if (data.user.role === 'ADMIN' || isAdminEmail) {
            setIsAdminAuthenticated(true);
          } else {
            if (location.pathname !== '/admin/login') {
              navigate('/admin/login');
            }
          }
        } else {
          if (location.pathname !== '/admin/login') {
            navigate('/admin/login');
          }
        }
      } catch (error) {
        console.error('Failed to verify admin status', error);
        if (location.pathname !== '/admin/login') {
          navigate('/admin/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate, location.pathname]);

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`campushub-full-backup-\${new Date().toISOString().split('T')[0]}.zip\`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // toast needed?
      }
    } catch (error) {
      console.error('Backup failed', error);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>;
  }

  // If not authenticated and not on the login page, don't render the layout
  if (!isAdminAuthenticated && location.pathname !== '/admin/login') {
    return null;
  }

  // If on the login page, just render the Outlet (which will be AdminLogin)
  if (location.pathname === '/admin/login') {
    return <Outlet />;
  }

`;

// Add useLocation
adminLayoutContent = adminLayoutContent.replace('useNavigate } from \'react-router-dom\';', 'useNavigate, useLocation } from \'react-router-dom\';');

// Insert after `const navigate = useNavigate();`
adminLayoutContent = adminLayoutContent.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n' + newUseEffect);

// Add the backup button to the profile dropdown
const backupButton = `
                        {user?.role === 'ADMIN' && (
                          <button 
                            onClick={handleBackup}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                          >
                            <Bookmark className="w-4 h-4" /> {/* Or Download */}
                            Backup DB
                          </button>
                        )}
`;

adminLayoutContent = adminLayoutContent.replace(`{user?.role === 'ADMIN' && (
                          <button 
                            onClick={() => {
                              navigate('/admin');
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            Admin Dashboard
                          </button>
                        )}`, backupButton + `
                        {user?.role === 'ADMIN' && (
                          <button 
                            onClick={() => {
                              navigate('/news');
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                          >
                            <Compass className="w-4 h-4" />
                            Exit Admin Panel
                          </button>
                        )}
`);

// Title rename: CampusHub -> Admin Panel
adminLayoutContent = adminLayoutContent.replace('className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">CampusHub</span>', 'className="text-xl font-bold text-red-500">Admin Panel</span>');

fs.writeFileSync('src/pages/admin/AdminLayout.tsx', adminLayoutContent);
console.log('Successfully updated AdminLayout.tsx');
