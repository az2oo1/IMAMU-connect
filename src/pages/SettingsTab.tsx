import React, { useState, useEffect } from 'react';
import { Shield, Lock, Palette, ChevronRight, ChevronLeft, LogOut, GripVertical, KeyRound, Fingerprint, Plus, Trash2 } from 'lucide-react';
import { Reorder } from 'motion/react';
import { useTheme } from '../ThemeContext';
import { useUser } from '../contexts/UserContext';
import { cn } from '../components/Layout';
import { toast } from 'sonner';

import { startRegistration } from '@simplewebauthn/browser';

export default function SettingsTab() {
  const { hue, setHue, colorPreset, setColorPreset, navOrder, setNavOrder, hiddenNavItems, setHiddenNavItems } = useTheme();
  const { isPrivateProfile, setIsPrivateProfile, user, updateProfile, logout } = useUser();
  const [activePage, setActivePage] = useState<'main' | 'privacy' | 'security' | 'appearance' | 'password_change'>('main');
  
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);
  const [googleConnectStep, setGoogleConnectStep] = useState<'email' | 'verify'>('email');
  const [googleConnectCode, setGoogleConnectCode] = useState('');
  const [showGoogleDisconnect, setShowGoogleDisconnect] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  
  // Passkey Data
  const [passkeys, setPasskeys] = useState<any[]>([]);

  const [isAddingPasskey, setIsAddingPasskey] = useState(false);

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    try {
      const res = await fetch('/api/auth/passkeys', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.passkeys) setPasskeys(data.passkeys);
    } catch {
      console.error('Failed to fetch passkeys');
    }
  };

  const handleAddPasskey = async () => {
    if (isAddingPasskey) return;
    setIsAddingPasskey(true);
    try {
      const resp = await fetch(`/api/auth/passkey/generate-registration-options?rpId=${encodeURIComponent(window.location.hostname)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resp.ok) throw new Error('Failed to get registration options');
      const opts = await resp.json();

      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: opts });
      } catch (error: any) {
        console.error('startRegistration error:', error);
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('sameOriginWithAncestors') || errorMsg.includes('iframe')) {
          toast.error("Passkeys cannot be used inside this preview iframe. Please open the app in a new tab.");
          return;
        }
        if (error.name === 'NotAllowedError' || errorMsg.includes('NotAllowedError') || errorMsg.includes('timed out or was not allowed')) {
          toast.error("Extension (e.g. Bitwarden) blocked the operation due to the preview iframe. Try opening the app in a new tab, or use a hardware key.");
          return;
        }
        if (error.name === 'InvalidStateError') toast.error("Authenticator already registered.");
        else toast.error(`Registration cancelled/failed: ${errorMsg}`);
        return;
      }

      const passkeyName = `Passkey (${new Date().toLocaleDateString()})`;

      const verificationResp = await fetch(`/api/auth/passkey/verify-registration?rpId=${encodeURIComponent(window.location.hostname)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ ...attResp, name: passkeyName }),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON && verificationJSON.verified) {
        toast.success("Passkey registered properly!");
        fetchPasskeys();
      } else {
        toast.error(`Verification failed: ${verificationJSON.details || verificationJSON.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Passkey registration failed');
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      const resp = await fetch(`/api/auth/passkeys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (resp.ok) fetchPasskeys();
      else toast.error('Failed to delete passkey');
    } catch {
      toast.error('Failed to delete passkey');
    }
  };

  const ALL_NAV_ITEMS = [
    { id: '/news', label: 'News' },
    { id: '/clubs', label: 'Clubs' },
    { id: '/map', label: 'Map' },
    { id: '/academics', label: 'Academics' },
    { id: '/explore', label: 'Explore' },
    { id: '/groups', label: 'Groups' },
    { id: '/calendar', label: 'Calendar' },
  ];

  const handleDragReorder = (newOrder: string[]) => {
    setNavOrder(newOrder);
  };

  const toggleNavItem = (id: string) => {
    if ((hiddenNavItems || []).includes(id)) {
      setHiddenNavItems((hiddenNavItems || []).filter(item => item !== id));
    } else {
      setHiddenNavItems([...(hiddenNavItems || []), id]);
    }
  };

  const setCustomHue = (val: number) => {
    setColorPreset('custom');
    setHue(val);
  };

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) return setPasswordError("New passwords don't match");
    if (newPassword.length < 6) return setPasswordError("Password must be at least 6 characters");
    
    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password');
      toast.success('Password changed successfully!');
      setActivePage('main');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderPasswordChange = () => (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => setActivePage('main')}
          className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-400 group-hover:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Change Password</h1>
          <p className="text-neutral-400 text-sm">Update your account password</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        {passwordError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
            {passwordError}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Old Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={passwordLoading}
          className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
        >
          {passwordLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );

  const renderMain = () => (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-neutral-400 mb-8">Manage your account preferences and appearance.</p>
      </div>
      
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg border-opacity-50">
        <button onClick={() => setActivePage('privacy')} className="w-full flex items-center justify-between p-5 hover:bg-neutral-800/80 transition-colors border-b border-neutral-800/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/50"><Shield className="w-5 h-5 text-neutral-300" /></div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Privacy</span>
              <span className="text-xs text-neutral-500">Profile visibility, notifications</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        </button>
        
        <button onClick={() => setActivePage('security')} className="w-full flex items-center justify-between p-5 hover:bg-neutral-800/80 transition-colors border-b border-neutral-800/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/50"><Lock className="w-5 h-5 text-neutral-300" /></div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Security & Accounts</span>
              <span className="text-xs text-neutral-500">Connected accounts</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        </button>
        
        <button onClick={() => setActivePage('appearance')} className="w-full flex items-center justify-between p-5 hover:bg-neutral-800/80 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/50"><Palette className="w-5 h-5 text-neutral-300" /></div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Appearance & Nav</span>
              <span className="text-xs text-neutral-500">Themes, colors, navigation bar</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg mt-6 border-opacity-50">
        <button onClick={logout} className="w-full p-5 text-red-500 font-semibold hover:bg-neutral-800/80 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-500/10 rounded-lg"><LogOut className="w-5 h-5 text-red-500" /></div>
            <span>Log Out</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-900" />
        </button>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-8 max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 pb-6 border-b border-neutral-800">
        <button onClick={() => setActivePage('main')} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800 text-neutral-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Privacy</h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Profile Visibility</h3>
          <p className="text-neutral-500 text-sm mb-4">Control who can see your profile details and posts.</p>
          <label className="flex items-center justify-between p-5 bg-neutral-900 rounded-2xl border border-neutral-800 cursor-pointer hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-neutral-950 border border-neutral-800/50 rounded-lg max-w-fit"><Shield className="w-5 h-5 text-neutral-300" /></div>
              <div>
                <span className="text-sm font-bold text-white block">Private Profile</span>
                <span className="text-xs text-neutral-500 border-opacity-50">Only approved followers can see your posts</span>
              </div>
            </div>
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-primary-500 cursor-pointer" 
              checked={isPrivateProfile}
              onChange={(e) => setIsPrivateProfile(e.target.checked)}
            />
          </label>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-2">Preferences</h3>
          <p className="text-neutral-500 text-sm mb-4">Control notifications and email updates.</p>
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
            <label className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-800/50 transition-colors">
              <span className="text-sm font-semibold text-neutral-200">Push Notifications</span>
              <input type="checkbox" className="w-5 h-5 accent-primary-500 cursor-pointer" defaultChecked />
            </label>
            <label className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-800/50 transition-colors">
              <span className="text-sm font-semibold text-neutral-200">Email Updates</span>
              <input type="checkbox" className="w-5 h-5 accent-primary-500 cursor-pointer" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-8 max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 pb-6 border-b border-neutral-800">
        <button onClick={() => setActivePage('main')} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800 text-neutral-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Security & Accounts</h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Password & Passkeys</h3>
          <p className="text-neutral-500 text-sm mb-4">Secure your account with a password or passkeys.</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => setActivePage('password_change')}
              className="w-full flex items-center justify-between p-4 bg-neutral-900 rounded-2xl border border-neutral-800 hover:bg-neutral-800/80 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/50 group-hover:border-neutral-700 transition-colors">
                  <KeyRound className="w-5 h-5 text-neutral-300" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold text-white block">Change Password</span>
                  <span className="text-xs text-neutral-500">Managed here securely</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-500" />
            </button>

            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm font-semibold text-white">Passkeys</span>
                </div>
                <button 
                  onClick={handleAddPasskey}
                  disabled={isAddingPasskey}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors px-2.5 py-1.5 bg-primary-500/10 rounded-lg disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> {isAddingPasskey ? 'Adding...' : 'Add Passkey'}
                </button>
              </div>
              <div className="divide-y divide-neutral-800">
                {passkeys.length === 0 ? (
                  <div className="p-6 text-center text-sm text-neutral-500">No passkeys added yet.</div>
                ) : (
                  passkeys.map((passkey: any) => (
                    <div key={passkey.id} className="flex items-center justify-between p-4 bg-neutral-950/50">
                      <div>
                        <span className="text-sm font-semibold text-white block">{passkey.name || 'New Device'}</span>
                        <span className="text-xs text-neutral-500">Added {new Date(passkey.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={() => handleDeletePasskey(passkey.id)}
                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 cursor-pointer" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-2">Account Connections</h3>
          <p className="text-neutral-500 text-sm mb-4">Link your academic and external accounts.</p>
          
          <div className="space-y-4 items-center gap-1">
            <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 flex flex-col gap-3">
              <span className="text-sm font-semibold text-neutral-200">IMAMU Student Email</span>
              <input 
                type="email" 
                placeholder="student@sm.imamu.edu.sa"
                className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none w-full shadow-inner"
                defaultValue={user?.studentEmail || ''}
                onBlur={(e) => {
                  if (e.target.value !== user?.studentEmail) {
                    updateProfile({ studentEmail: e.target.value });
                  }
                }}
              />
            </div>

            <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800">
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-sm font-semibold text-neutral-200">Google Account</span>
              </div>
              
              {user?.googleEmail ? (
                <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-xl border border-neutral-800 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-neutral-200">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">Connected</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{user.googleEmail}</p>
                    </div>
                  </div>
                  <button 
                    className="px-4 py-2 bg-red-500/10 text-red-500 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                    onClick={() => setShowGoogleDisconnect(true)}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
                  onClick={() => setShowGoogleConnect(true)}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-8 max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 pb-6 border-b border-neutral-800">
        <button onClick={() => setActivePage('main')} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800 text-neutral-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Appearance & Navigation</h2>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Theme Colors</h3>
          <p className="text-neutral-500 text-sm mb-4">Customize the base color for the entire application.</p>
          
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-neutral-200">Theme Base Color</label>
              <div className="flex flex-wrap gap-3">
                {(['primary', 'rose', 'blue', 'green', 'amber'] as const).map(preset => (
                  <button
                    key={preset}
                    onClick={() => setColorPreset(preset)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all",
                      colorPreset === preset 
                        ? "bg-primary-500 text-white shadow-lg scale-[1.02]" 
                        : "bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-200">Custom Color Hue</label>
                <span className="text-xs font-bold tabular-nums bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }} />
                  {hue}°
                </span>
              </div>
              <div className="relative h-6 pt-2">
              <div 
                className="absolute top-2 w-full h-2 rounded-lg pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, hsl(0, 80%, 50%), hsl(60, 80%, 50%), hsl(120, 80%, 50%), hsl(180, 80%, 50%), hsl(240, 80%, 50%), hsl(300, 80%, 50%), hsl(360, 80%, 50%))'
                }}
              />
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={hue}
                onChange={(e) => setCustomHue(Number(e.target.value))}
                className="absolute top-2 w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
          </div>
        </div>
        </div>

        <div>
           <h3 className="text-lg font-bold text-white mb-2">Navigation Bar</h3>
           <p className="text-neutral-500 text-sm mb-4">Drag to reorder tabs and toggle their visibility in the top bar.</p>
           
           <div className="space-y-2 pb-2">
            <Reorder.Group axis="y" values={navOrder} onReorder={handleDragReorder} className="space-y-2">
              {navOrder.map((itemId) => {
                const item = ALL_NAV_ITEMS.find(i => i.id === itemId);
                if (!item) return null;
                
                const isHidden = (hiddenNavItems || []).includes(itemId);
                
                return (
                  <Reorder.Item 
                    key={itemId} 
                    value={itemId}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-colors cursor-grab active:cursor-grabbing",
                      isHidden ? "bg-neutral-950/80 border-neutral-800/50 opacity-80" : "bg-neutral-900 shadow-sm border-neutral-800"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="pr-4 border-r border-neutral-800/50 text-neutral-500 hover:text-neutral-300 transition-colors">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <span className={cn("font-bold", isHidden ? "text-neutral-400" : "text-white")}>{item.label}</span>
                    </div>
                    
                    <label className="flex items-center gap-3 cursor-pointer" onPointerDown={e => e.stopPropagation()}>
                      <span className="text-xs text-neutral-500 uppercase font-black tracking-widest">{isHidden ? 'Hidden' : 'Visible'}</span>
                      <div className="relative inline-block w-11 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-neutral-800 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-primary-500" 
                          checked={!isHidden}
                          onChange={() => toggleNavItem(itemId)}
                        />
                        <label className="toggle-label block overflow-hidden h-6 rounded-full bg-neutral-800 cursor-pointer"></label>
                      </div>
                    </label>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-neutral-950 h-full relative">
      {activePage === 'main' && renderMain()}
      {activePage === 'privacy' && renderPrivacy()}
      {activePage === 'security' && renderSecurity()}
      {activePage === 'appearance' && renderAppearance()}
      {activePage === 'password_change' && renderPasswordChange()}

      {/* Google Connect Modal */}
      {showGoogleConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowGoogleConnect(false); setGoogleConnectStep('email'); setGoogleConnectCode(''); }} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 sm:p-8">
            {googleConnectStep === 'email' ? (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Connect Google Account</h3>
                <p className="text-sm text-neutral-400 mb-6">Enter your Google email to connect your account.</p>
                <input 
                  type="email" 
                  value={googleEmailInput} 
                  onChange={e => setGoogleEmailInput(e.target.value)} 
                  placeholder="your.email@gmail.com"
                  className="w-full mb-6 p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary-500 shadow-inner"
                />
                <div className="flex justify-end gap-3 font-semibold">
                  <button className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors" onClick={() => setShowGoogleConnect(false)}>
                    Cancel
                  </button>
                  <button 
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20"
                    onClick={() => {
                      if (googleEmailInput) {
                        toast.success("Verification code sent to " + googleEmailInput);
                        setGoogleConnectStep('verify');
                      }
                    }} 
                  >
                    Send Code
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Verify Email</h3>
                <p className="text-sm text-neutral-400 mb-6 text-balance">Please enter the 4-digit code sent to {googleEmailInput}. (Enter any code to proceed)</p>
                <input 
                  type="text" 
                  value={googleConnectCode} 
                  onChange={e => setGoogleConnectCode(e.target.value)} 
                  placeholder="••••"
                  className="w-full mb-6 p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary-500 shadow-inner text-center tracking-widest font-mono text-xl"
                  maxLength={4}
                />
                <div className="flex justify-end gap-3 font-semibold">
                  <button className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors" onClick={() => setGoogleConnectStep('email')}>
                    Back
                  </button>
                  <button 
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20"
                    onClick={() => {
                      if (googleConnectCode) {
                        updateProfile({ googleEmail: googleEmailInput });
                        toast.success("Google account connected!");
                        setShowGoogleConnect(false);
                        setGoogleEmailInput('');
                        setGoogleConnectStep('email');
                        setGoogleConnectCode('');
                      }
                    }} 
                  >
                    Verify & Connect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Google Disconnect Modal */}
      {showGoogleDisconnect && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGoogleDisconnect(false)} />
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-white mb-2">Disconnect Account</h3>
            <p className="text-sm text-neutral-400 mb-8 leading-relaxed">Are you sure you want to disconnect your Google account? You will no longer be able to log in using Google.</p>
            <div className="flex justify-end gap-4 font-semibold">
              <button className="px-5 py-2.5 text-neutral-400 hover:text-white transition-colors" onClick={() => setShowGoogleDisconnect(false)}>
                Cancel
              </button>
              <button 
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                onClick={() => {
                  updateProfile({ googleEmail: '' });
                  setShowGoogleDisconnect(false);
                }} 
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Style for toggle */}
      <style>{`
        .toggle-checkbox:checked + .toggle-label {
          background-color: var(--color-primary-500, #3b82f6);
        }
      `}</style>
    </div>
  );
}
