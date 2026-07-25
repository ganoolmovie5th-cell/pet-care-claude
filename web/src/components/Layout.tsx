import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.svg" alt="" />
          Pet Care
        </div>

        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/bookings">Bookings</NavLink>
          <NavLink to="/reviews">Reviews</NavLink>
        </nav>

        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <button type="button" className="btn-ghost" onClick={() => logout()}>
            Keluar
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
