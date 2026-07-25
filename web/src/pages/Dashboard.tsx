import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import BookingsTable from '../components/BookingsTable';
import { getVetDashboard, type VetBooking, type VetEarnings } from '../services/vet-dashboard';

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function Dashboard() {
  const { vetId } = useAuth();
  const [earnings, setEarnings] = useState<VetEarnings | null>(null);
  const [bookings, setBookings] = useState<VetBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vetId) return;
    getVetDashboard(vetId)
      .then(data => {
        setEarnings(data.earnings);
        setBookings(data.recentBookings);
      })
      .catch(() => setError('Gagal memuat dashboard.'));
  }, [vetId]);

  if (error) return <p className="error">{error}</p>;
  if (!earnings) return <p className="empty">Memuat…</p>;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtitle">
        Terakhir diperbarui {new Date(earnings.lastUpdated).toLocaleString('id-ID')}
      </p>

      <div className="stat-grid">
        <div className="card">
          <p className="stat-label">Total pendapatan</p>
          <p className="stat-value">{rupiah(earnings.totalEarnings)}</p>
        </div>
        <div className="card">
          <p className="stat-label">Bulan ini</p>
          <p className="stat-value">{rupiah(earnings.monthlyEarnings)}</p>
        </div>
        <div className="card">
          <p className="stat-label">Booking selesai</p>
          <p className="stat-value">{earnings.bookingCount}</p>
          <p className="stat-hint">Sejak akun dibuat</p>
        </div>
      </div>

      <div className="card">
        <h2 className="stat-label">Booking terbaru</h2>
        <BookingsTable bookings={bookings} />
      </div>
    </>
  );
}
