import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use sessionStorage to keep the user logged in across page reloads, but not across browser sessions.
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const signedInUser = await authService.signIn(email, password);
    setUser(signedInUser);
    try {
      sessionStorage.setItem('user', JSON.stringify(signedInUser));
    } catch (error) {
      console.error("Could not save user to sessionStorage", error);
    }
  }, []);

  const signOut = useCallback(() => {
    authService.signOut();
    setUser(null);
    try {
      sessionStorage.removeItem('user');
    } catch (error) {
      console.error("Could not remove user from sessionStorage", error);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};