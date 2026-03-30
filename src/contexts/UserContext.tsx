import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  isAuthenticated: boolean;
  login: (username: string, pass: string) => void;
  logout: () => void;
  isVerified: boolean;
  verifyStudent: (email: string, code: string) => boolean;
  isPrivateProfile: boolean;
  setIsPrivateProfile: (val: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);

  const login = (username: string, pass: string) => {
    // Mock login
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsVerified(false);
  };

  const verifyStudent = (email: string, code: string) => {
    if (email.endsWith('@sm.imamu.edu.sa') && code === '1234') {
      setIsVerified(true);
      return true;
    }
    return false;
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, login, logout, isVerified, verifyStudent, isPrivateProfile, setIsPrivateProfile }}>
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
