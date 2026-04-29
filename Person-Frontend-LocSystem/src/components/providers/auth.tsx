'use client';

import { toast } from 'sonner';
import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}

interface AuthContextProps {
  user: User;
  signOut(): Promise<void>;
  setUser(user: User): void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEFAULT_USER: User = {
  id: '',
  name: 'Usuário',
  email: '',
  role: 'ADMIN',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [user, setUserState] = useState<User>(() => {
    try {
      const stored = localStorage.getItem('locsystem_user');
      return stored ? JSON.parse(stored) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const setUser = (newUser: User) => {
    setUserState(newUser);
    localStorage.setItem('locsystem_user', JSON.stringify(newUser));
  };

  async function signOut() {
    localStorage.removeItem('locsystem_user');
    localStorage.removeItem('locsystem_token');
    toast.success('Você saiu com sucesso.');
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{ user, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
