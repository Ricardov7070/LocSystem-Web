'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';


export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}


export interface SignOutAlert {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}


interface AuthContextProps {
  user: User;
  signOut(): Promise<void>;
  setUser(user: User): void;
  signOutAlert: SignOutAlert | null;
  clearSignOutAlert(): void;
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


  const [signOutAlert, setSignOutAlert] = useState<SignOutAlert | null>(null);


  const setUser = (newUser: User) => {
    setUserState(newUser);
    localStorage.setItem('locsystem_user', JSON.stringify(newUser));
  };


  async function signOut() {

    let message = '✅ Você saiu com sucesso.';

    try {
      const { data } = await api.get('/logoutUser');
      if (data?.success) message = `✅ ${data.success}`;
    } catch {
    }

    localStorage.removeItem('locsystem_user');
    localStorage.removeItem('locsystem_token');
    setSignOutAlert({ message, type: 'success' });

    setTimeout(() => {
      navigate('/login');
    }, 1000);

  }

  return (
    <AuthContext.Provider value={{ user, signOut, setUser, signOutAlert, clearSignOutAlert: () => setSignOutAlert(null) }}>
      {children}
    </AuthContext.Provider>
  );
}
