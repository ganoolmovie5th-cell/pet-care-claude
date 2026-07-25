import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { firebaseConfigured } from '../services/firebase-config';
import { demoCredentials, demoMode } from '../services/demo';

export default function Login() {
  const { user, error, login } = useAuth();
  const [email, setEmail] = useState(demoMode ? demoCredentials.email : '');
  const [password, setPassword] = useState(demoMode ? demoCredentials.password : '');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
    } catch {
      // useAuth already stores the message in `error`
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <img src="/logo.svg" alt="" width={56} height={56} />
        <h1>Vet Dashboard</h1>
        <p className="subtitle">Masuk pakai akun vet kamu</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {demoMode && (
          <p className="stat-hint">
            Mode demo — data di dalam cuma contoh. Login: {demoCredentials.email} /{' '}
            {demoCredentials.password}
          </p>
        )}
        {!demoMode && !firebaseConfigured && (
          <p className="error">
            Firebase belum dikonfigurasi. Set VITE_FIREBASE_* di environment, lalu deploy ulang.
          </p>
        )}
        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={busy || (!demoMode && !firebaseConfigured)}>
          {busy ? 'Masuk…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
