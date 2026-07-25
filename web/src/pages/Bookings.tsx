import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import BookingsTable from '../components/BookingsTable';
import { getVetBookings, type VetBooking } from '../services/vet-dashboard';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function Bookings() {
  const { vetId } = useAuth();
  const [bookings, setBookings] = useState<VetBooking[] | null>(null);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vetId) return;
    getVetBookings(vetId)
      .then(setBookings)
      .catch(() => setError('Gagal memuat booking.'));
  }, [vetId]);

  const visible = useMemo(
    () => (bookings ?? []).filter(b => status === 'all' || b.status === status),
    [bookings, status],
  );

  if (error) return <p className="error">{error}</p>;
  if (!bookings) return <p className="empty">Memuat…</p>;

  return (
    <>
      <h1>Bookings</h1>
      <p className="subtitle">{bookings.length} booking terakhir</p>

      <div className="toolbar">
        <label>
          Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <BookingsTable bookings={visible} />
      </div>
    </>
  );
}
