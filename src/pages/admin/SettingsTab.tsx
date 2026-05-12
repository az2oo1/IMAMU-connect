import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, ShieldAlert, Check, X, Mail, Server, Key, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminSettingsTab() {
  const [useOtp, setUseOtp] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setUseOtp(data.settings?.OTP_ENABLED !== 'false');
      setSmtpHost(data.settings?.SMTP_HOST || '');
      setSmtpPort(data.settings?.SMTP_PORT || '587');
      setSmtpUser(data.settings?.SMTP_USER || '');
      setSmtpPass(data.settings?.SMTP_PASS || '');
      setSmtpFrom(data.settings?.SMTP_FROM || '');
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const newValue = !useOtp;
    // Optimistic update for fast UI response
    setUseOtp(newValue);
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ key: 'OTP_ENABLED', value: newValue.toString() })
      });
      if (res.ok) {
        toast.success(`OTP is now ${newValue ? 'Enabled' : 'Disabled (uses 12345)'}`);
      } else {
        setUseOtp(!newValue);
        toast.error("Failed to update setting");
      }
    } catch (e: any) {
      setUseOtp(!newValue);
      toast.error("Error updating setting");
    }
  };

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    try {
      const updates = [
        { key: 'SMTP_HOST', value: smtpHost },
        { key: 'SMTP_PORT', value: smtpPort },
        { key: 'SMTP_USER', value: smtpUser },
        { key: 'SMTP_PASS', value: smtpPass },
        { key: 'SMTP_FROM', value: smtpFrom },
      ];
      
      let allOk = true;
      for (const item of updates) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}` 
          },
          body: JSON.stringify(item)
        });
        if (!res.ok) allOk = false;
      }
      
      if (allOk) {
        toast.success('SMTP Configuration saved');
      } else {
        toast.error('Some SMTP settings failed to save');
      }
    } catch (e: any) {
      toast.error('Network error saving SMTP config');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10 pb-16">
      <div className="border-b border-neutral-800 pb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Global Settings</h2>
        <p className="text-neutral-500 text-sm">Manage wide-reaching app configurations and infrastructure.</p>
      </div>
      
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white mb-2">Authentication & Security</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl gap-6 relative overflow-hidden">
          {/* Subtle background glow depending on state */}
          <div className={cn(
            "absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r opacity-10 pointer-events-none transition-colors duration-500",
            useOtp ? "from-green-500 to-transparent" : "from-amber-500 to-transparent"
          )} />
          
          <div className="flex items-start gap-4 relative z-10">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors duration-500",
              useOtp ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
            )}>
              {useOtp ? <Shield className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight mb-1">Email Verification (OTP)</h3>
              <p className="text-sm text-neutral-400">
                Require a verification code sent to the student's email to verify `.edu.sa` emails. <br />
                <span className="inline-block mt-1">If disabled, any user can bypass verification by entering <code className="bg-neutral-950 border border-neutral-800 text-primary-400 px-1.5 py-0.5 rounded font-mono text-xs">12345</code>.</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggle}
            className={cn(
              "shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-50",
              useOtp 
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                : "bg-primary-500 text-black hover:bg-primary-600"
            )}
          >
            {useOtp ? 'Disable OTP' : 'Enable OTP'}
          </button>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">SMTP Server Configuration</h3>
          <p className="text-sm text-neutral-400 max-w-xl mb-4">
            Configure how the system sends outgoing emails (such as OTPs). You can use a service like SendGrid, Mailgun, Amazon SES, or your own SMTP server.
          </p>
        </div>
        
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Mail className="w-32 h-32 text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-300 block">SMTP Host</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Server className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="smtp.sendgrid.net"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-300 block">SMTP Port</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-300 block">SMTP Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="apikey"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-300 block">SMTP Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-colors font-mono"
                />
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-neutral-300 block">From Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                  type="email"
                  placeholder="noreply@campushub.edu.sa"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2 relative z-10">
            <button
              onClick={handleSaveSmtp}
              disabled={isSavingSmtp}
              className="bg-white text-black hover:bg-neutral-200 font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingSmtp ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
