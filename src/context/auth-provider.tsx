"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Safety fallback: if Firebase Auth takes longer than 2s (e.g. ad-blocker, Brave Shields, offline),
    // mark loading as false so background auth never hangs the client state.
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    try {
      const unsubscribe = onIdTokenChanged(
        auth,
        (currentUser) => {
          clearTimeout(fallbackTimer);
          setUser(currentUser);
          setLoading(false);
          setError(null);
        },
        (err) => {
          clearTimeout(fallbackTimer);
          console.error('Firebase Auth error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch (err) {
      clearTimeout(fallbackTimer);
      console.error('Failed to initialize Firebase Auth:', err);
      setError(err instanceof Error ? err.message : 'Unknown auth error');
      setLoading(false);
    }
  }, []);

  const value = { user, loading, error };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
