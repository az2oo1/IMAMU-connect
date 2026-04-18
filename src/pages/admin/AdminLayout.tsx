import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Users, Building2, BookOpen, Newspaper, AlertTriangle, LogOut, Shield, Download } from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminLayout() {
  const navigate = useNavigate();
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
          headers: { Authorization: `Bearer ${token}` }
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAdminAuthenticated(false);
    navigate('/admin/login');
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campushub-full-backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download backup');
      }
    } catch (error) {
      console.error('Backup failed', error);
      alert('Backup failed');
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

  const navItems = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/clubs', icon: Building2, label: 'Clubs' },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
    { to: '/admin/news', icon: Newspaper, label: 'News' },
    { to: '/admin/reports', icon: AlertTriangle, label: 'Reports' },
  ];

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-neutral-400">CampusHub Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                isActive 
                  ? "bg-primary-500/10 text-primary-400" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-2">
          <button 
            onClick={handleBackup}
            className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Backup DB
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-950">
        <Outlet />
      </main>
    </div>
  );
}
