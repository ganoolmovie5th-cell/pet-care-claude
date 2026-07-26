'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isDemoMode } from '@/lib/firebase';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult();
        if (idTokenResult.claims.admin) {
          setUser(currentUser);
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [router]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user && !isDemoMode) return null;

  return (
    <>
      {isDemoMode && (
        <div className="bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          MODE DEMO — auth dilewati karena kredensial Firebase belum diisi. Set env
          NEXT_PUBLIC_FIREBASE_* asli untuk mengaktifkan login.
        </div>
      )}
      <nav className="bg-[#0f5c4a] shadow">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
              <h1 className="text-lg font-bold text-white">Pet Care Admin</h1>
            </div>
            <button
              onClick={() => auth.signOut()}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </>
  );
}
