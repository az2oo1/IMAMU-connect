import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Fingerprint, ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { cn } from './Layout';
import { startAuthentication } from '@simplewebauthn/browser';

type AuthMode = 'login' | 'signup_main' | 'signup_verify_code' | 'signup_student_email' | 'signup_google_mock';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login, register } = useUser();
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup fields
  const [personalEmail, setPersonalEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  // Google mock
  const [googleAuthEmail, setGoogleAuthEmail] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Username checking
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');

  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setLoginIdentifier('');
      setLoginPassword('');
      setPersonalEmail('');
      setVerificationCode('');
      setStudentEmail('');
      setUsername('');
      setPassword('');
      setPasswordConfirm('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if ((mode === 'signup_main' || mode === 'signup_google_mock') && username.length > 2) {
      const checkAvailability = async () => {
        setUsernameStatus('checking');
        try {
          const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
          const data = await res.json();
          if (data.available) {
            setUsernameStatus('available');
          } else {
            setUsernameStatus('taken');
          }
        } catch {
          setUsernameStatus('idle');
        }
      };
      const timer = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timer);
    } else if (mode === 'signup_main' || mode === 'signup_google_mock') {
      setUsernameStatus('idle');
    }
  }, [username, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginIdentifier, loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);
    try {
      let generateUrl = `/api/auth/passkey/generate-authentication-options?rpId=${encodeURIComponent(window.location.hostname)}`;
      if (loginIdentifier) {
        generateUrl += `&username=${encodeURIComponent(loginIdentifier)}`;
      }
      const resp = await fetch(generateUrl);
      
      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to get authentication options');
      }
      
      const { options, sessionId } = await resp.json();
      
      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (error: any) {
        console.error('startAuthentication error:', error);
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('sameOriginWithAncestors') || errorMsg.includes('iframe')) {
          throw new Error("Passkeys cannot be used inside this preview iframe. Please open the app in a new tab.");
        }
        if (error.name === 'NotAllowedError' || errorMsg.includes('NotAllowedError') || errorMsg.includes('timed out or was not allowed')) {
          throw new Error("Extension (e.g. Bitwarden) blocked the operation due to the preview iframe. Try opening the app in a new tab, or use a hardware key.");
        }
        throw new Error(`Authentication cancelled or failed: ${errorMsg}`);
      }

      const verificationResp = await fetch(`/api/auth/passkey/verify-authentication?rpId=${encodeURIComponent(window.location.hostname)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginIdentifier || undefined,
          sessionId,
          response: asseResp,
        }),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON && verificationJSON.success) {
        toast.success("Successfully authenticated with Passkey!");
        localStorage.setItem('token', verificationJSON.token);
        window.location.reload(); 
      } else {
        throw new Error(verificationJSON.error || 'Passkey verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Passkey login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'signup_main') {
      if (!personalEmail) return setError('Email is required');
      if (usernameStatus === 'taken') return setError('Please choose an available username');
      if (username.length < 3) return setError('Username must be at least 3 characters');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== passwordConfirm) return setError('Passwords do not match');
      
      // Mock sending code
      toast.success('Verification code sent to your email');
      setMode('signup_verify_code');
    } else if (mode === 'signup_verify_code') {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/otp-status');
        const data = await res.json();
        
        if (data.enabled) {
          if (verificationCode !== '12345' && verificationCode !== '000000') {
             setLoading(false);
             return setError('Invalid verification code');
          }
        } else {
          if (verificationCode !== '12345') {
             setLoading(false);
             return setError('Invalid mock verification code (use 12345)');
          }
        }
        setMode('signup_student_email');
      } catch (e: any) {
        setError('Verification failed');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signup_student_email') {
      setLoading(true);
      try {
        await register(username, password, studentEmail, personalEmail);
        toast.success("Account created successfully!");
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to create account');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'signup_google_mock') {
      if (!googleAuthEmail) return setError('Email is required');
      if (usernameStatus === 'taken') return setError('Please choose an available username');
      if (username.length < 3) return setError('Username must be at least 3 characters');
      setLoading(true);
      try {
        // Here we simulate Google auth with a temporary password and auto-verification
        await register(username, "google_auth_placeholder123", "", googleAuthEmail);
        toast.success("Signed up with Google successfully!");
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to sign up with Google');
      } finally {
        setLoading(false);
      }
    }
  };

  const socialButtons = (
    <div className="space-y-3">
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
        onClick={handlePasskeyLogin}
        className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-3 border border-neutral-700 hover:border-neutral-600"
      >
        <Fingerprint className="w-5 h-5 text-primary-400" />
        Passkey
      </button>

      <button
        type="button"
        onClick={() => {
          setGoogleAuthEmail('');
          setMode('signup_google_mock');
        }}
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
    </div>
  );

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
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 relative h-14">
              {mode !== 'login' && mode !== 'signup_main' && (
                <button 
                  onClick={() => {
                    if (mode === 'signup_verify_code') setMode('signup_main');
                    else if (mode === 'signup_student_email') setMode('signup_verify_code');
                    else if (mode === 'signup_google_mock') setMode('login');
                  }}
                  className="absolute left-4 p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className={cn("text-lg font-semibold text-neutral-100", mode !== 'login' && mode !== 'signup_main' ? "mx-auto" : "")}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <button 
                onClick={onClose} 
                className="absolute right-4 p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                  {error}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Username or Email</label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter your username or email"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
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
                    {loading ? 'Please wait...' : 'Sign In'}
                  </button>

                  {socialButtons}

                  <p className="text-center text-sm text-neutral-400 mt-4">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup_main')}
                      className="text-primary-400 hover:text-primary-300 font-medium"
                    >
                      Sign Up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignupNext} className="space-y-4">
                  {mode === 'signup_main' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Personal Email</label>
                        <input
                          type="email"
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="you@gmail.com"
                          required
                          autoFocus
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Username</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={cn(
                              "w-full bg-neutral-800 border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2",
                              usernameStatus === 'available' ? "border-green-500/50 focus:ring-green-500" :
                              usernameStatus === 'taken' ? "border-red-500/50 focus:ring-red-500" :
                              "border-neutral-700 focus:ring-primary-500"
                            )}
                            placeholder="e.g. campus_legend"
                            required
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
                            {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {usernameStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        </div>
                        {usernameStatus === 'taken' && <p className="text-red-400 text-xs mt-1">Username is already taken</p>}
                        {usernameStatus === 'available' && <p className="text-green-500 text-xs mt-1">Username is available!</p>}
                      </div>

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

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Repeat Password</label>
                        <input
                          type="password"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {mode === 'signup_verify_code' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Confirmation code</label>
                      <p className="text-xs text-neutral-500 mb-3">Please check {personalEmail} for a code (you can enter any code for now)</p>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-center tracking-widest font-mono text-lg"
                        placeholder="••••"
                        required
                        autoFocus
                      />
                    </motion.div>
                  )}

                  {mode === 'signup_student_email' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Add your student email</label>
                      <p className="text-xs text-neutral-500 mb-3">Optional but recommended for campus features</p>
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="student@imamu.edu.sa"
                        autoFocus
                      />
                    </motion.div>
                  )}

                  {mode === 'signup_google_mock' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Google Email</label>
                        <input
                          type="email"
                          value={googleAuthEmail}
                          onChange={(e) => setGoogleAuthEmail(e.target.value)}
                          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="you@gmail.com"
                          required
                          autoFocus
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Choose a Username</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={cn(
                              "w-full bg-neutral-800 border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2",
                              usernameStatus === 'available' ? "border-green-500/50 focus:ring-green-500" :
                              usernameStatus === 'taken' ? "border-red-500/50 focus:ring-red-500" :
                              "border-neutral-700 focus:ring-primary-500"
                            )}
                            placeholder="e.g. campus_legend"
                            required
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
                            {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {usernameStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        </div>
                        {usernameStatus === 'taken' && <p className="text-red-400 text-xs mt-1">Username is already taken</p>}
                        {usernameStatus === 'available' && <p className="text-green-500 text-xs mt-1">Username is available!</p>}
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || usernameStatus === 'checking'}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                  >
                    {loading ? 'Please wait...' : (mode === 'signup_student_email' || mode === 'signup_google_mock' ? 'Make Account' : 'Continue')}
                  </button>

                  <p className="text-center text-sm text-neutral-400 mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary-400 hover:text-primary-300 font-medium"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
