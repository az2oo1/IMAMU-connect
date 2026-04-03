import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  name: string | null;
  studentEmail?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  createdAt?: string;
}

interface UserContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, pass: string) => Promise<void>;
  register: (username: string, pass: string, email?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; bio?: string; avatarUrl?: string; bannerUrl?: string; linkedinUrl?: string; githubUrl?: string }) => Promise<void>;
  isVerified: boolean;
  verifyStudent: (email: string, code: string) => boolean;
  isPrivateProfile: boolean;
  setIsPrivateProfile: (val: boolean) => void;
  isAuthReady: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsAuthReady(true);
    };
    checkAuth();
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const register = async (username: string, pass: string, email?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, email })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setIsVerified(false);
  };

  const updateProfile = async (data: { name?: string; bio?: string; avatarUrl?: string; bannerUrl?: string; linkedinUrl?: string; githubUrl?: string }) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update profile');
    }
    
    const resData = await res.json();
    setUser(resData.user);
  };

  const verifyStudent = (email: string, code: string) => {
    if (email.endsWith('@sm.imamu.edu.sa') && code === '1234') {
      setIsVerified(true);
      return true;
    }
    return false;
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, user, login, register, logout, updateProfile, isVerified, verifyStudent, isPrivateProfile, setIsPrivateProfile, isAuthReady }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
