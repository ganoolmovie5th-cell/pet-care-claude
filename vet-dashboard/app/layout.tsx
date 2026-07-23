'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (pathname !== '/login') router.replace('/login');
        setChecking(false);
        return;
      }

      const token = await user.getIdTokenResult();
      // ponytail: custom claim set by admin SDK on vet approval
      if (!token.claims['custom.vet']) {
        await auth.signOut();
        router.replace('/login');
      }

      setChecking(false);
    });

    return unsubscribe;
  }, [pathname, router]);

  if (checking) {
    return (
      <html lang="id">
        <body className="flex min-h-screen items-center justify-center bg-gray-50">
          <span className="text-gray-500 text-sm">Memuat…</span>
        </body>
      </html>
    );
  }

  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
