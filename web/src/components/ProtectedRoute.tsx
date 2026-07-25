import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, vetId, loading } = useAuth();

  if (loading) return <div className="empty">Memuat…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!vetId) {
    return (
      <div className="login-page">
        <div className="card login-card">
          <h1>Akun ini bukan akun vet</h1>
          <p className="subtitle">
            Dashboard ini hanya untuk vet. Hubungi admin untuk mendapatkan akses.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
