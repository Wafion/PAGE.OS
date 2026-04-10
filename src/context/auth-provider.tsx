"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoaderCircle } from 'lucide-react';

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-4 bg-background text-foreground">
        <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
        <span>Authenticating...</span>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
