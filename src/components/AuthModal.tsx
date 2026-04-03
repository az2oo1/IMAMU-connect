import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, register } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, email);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-100">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Choose a username"
                    required
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Student Email (Optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="student@imamu.edu.sa"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-neutral-900 text-neutral-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert("Google Sign-In will be implemented soon!")}
                  className="w-full bg-white text-black hover:bg-neutral-200 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>

                <p className="text-center text-sm text-neutral-400 mt-4">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary-400 hover:text-primary-300 font-medium"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
