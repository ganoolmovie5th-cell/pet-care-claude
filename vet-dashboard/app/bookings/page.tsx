'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getVetBookings, Booking } from '@/lib/api';
import BookingCard from '@/components/BookingCard';
import DashboardShell from '@/components/DashboardShell';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const vetId = auth.currentUser?.uid;
    if (!vetId) return;

    getVetBookings(vetId)
      .then(setBookings)
      .catch(() => setError('Gagal memuat pemesanan.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? bookings.filter(
        (b) =>
          b.serviceName.toLowerCase().includes(search.toLowerCase()) ||
          b.id.toLowerCase().includes(search.toLowerCase()),
      )
    : bookings;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Pemesanan</h1>

        <input
          type="search"
          placeholder="Cari layanan atau ID pemesanan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {loading && <p className="text-sm text-gray-400">Memuat…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-gray-400">Tidak ada pemesanan ditemukan.</p>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
