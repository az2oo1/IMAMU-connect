import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user, isAuthenticated, updateProfile } = useUser();

  const handleContinueAsUser = () => {
    const isAdminEmail = user?.studentEmail === 'abdulazizalgassem4@gmail.com' || user?.googleEmail === 'abdulazizalgassem4@gmail.com';
    if (user?.role === 'ADMIN' || isAdminEmail) {
      navigate('/admin/users');
    } else {
      setError('Your current account does not have administrator privileges.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(username, password);

      const isAdminEmail = loggedInUser.studentEmail === 'abdulazizalgassem4@gmail.com' || loggedInUser.googleEmail === 'abdulazizalgassem4@gmail.com';
      if (loggedInUser.role !== 'ADMIN' && !isAdminEmail) {
        throw new Error('Unauthorized: Admin access required.');
      }

      navigate('/admin/users');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-neutral-400">Sign in to manage CampusHub</p>
        </div>

        <form onSubmit={handleLogin} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Username or Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  placeholder="Admin username or email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Admin Portal'}
          </button>

          {isAuthenticated && user && (
            <div className="mt-6">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-neutral-900 px-2 text-neutral-500">Or continue with</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleContinueAsUser}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-all border border-neutral-700"
              >
                <img 
                  src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} 
                  alt="" 
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
                Continue as {user.name || user.username}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
