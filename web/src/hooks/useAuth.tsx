import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { demoCredentials, demoMode, demoVetId } from '../services/demo';

// Only the fields the UI actually reads. Firebase's User has ~20 more members
// that no component touches.
const demoUser = { email: demoCredentials.email, uid: demoVetId } as unknown as User;

const DEMO_SESSION_KEY = 'petcare.demo';

export interface AuthState {
  user: User | null;
  vetId: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vetId, setVetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      if (sessionStorage.getItem(DEMO_SESSION_KEY)) {
        setUser(demoUser);
        setVetId(demoVetId);
      }
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async current => {
      setUser(current);
      if (current) {
        const { claims } = await current.getIdTokenResult();
        // Matches backend/src/middleware/vetAuth.ts, which reads decoded['custom']?.vet
        const custom = claims.custom as { vet?: string } | undefined;
        setVetId(custom?.vet ?? null);
      } else {
        setVetId(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);

    if (demoMode) {
      if (email !== demoCredentials.email || password !== demoCredentials.password) {
        setError('Email atau password salah.');
        throw new Error('login failed');
      }
      sessionStorage.setItem(DEMO_SESSION_KEY, '1');
      setUser(demoUser);
      setVetId(demoVetId);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Email atau password salah.');
      throw new Error('login failed');
    }
  };

  const logout = async () => {
    if (demoMode) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setVetId(null);
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, vetId, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
