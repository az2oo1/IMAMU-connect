import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

export default function VerificationGuard({ children }: { children: React.ReactNode }) {
  const { isVerified, verifyStudent } = useUser();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState('');

  if (isVerified) {
    return <>{children}</>;
  }

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@sm.imamu.edu.sa')) {
      setError('Please use a valid @sm.imamu.edu.sa student email.');
      return;
    }
    setError('');
    setStep('code');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await verifyStudent(email, code);
      if (!success) {
        setError('Invalid verification code. Try 1234.');
      }
    } catch (err) {
      setError('Failed to verify student email.');
    }
  };

  return (
    <div className="flex-1 h-full flex items-center justify-center p-4 bg-neutral-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-400" />
        
        <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/20">
          <ShieldAlert className="w-8 h-8 text-primary-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Student Verification</h2>
        <p className="text-neutral-400 mb-8 text-sm">
          Access to Academics and Groups is restricted to verified students only.
        </p>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">University Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@sm.imamu.edu.sa"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Send Verification Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-200">Code sent to</p>
                <p className="text-sm font-medium text-white">{email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 4-digit code (1234)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors tracking-widest"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Verify Access
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
