import type { VetBooking } from '../services/vet-dashboard';

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function BookingsTable({ bookings }: { bookings: VetBooking[] }) {
  if (bookings.length === 0) return <p className="empty">Belum ada booking.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Layanan</th>
          <th>Owner</th>
          <th>Status</th>
          <th className="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map(b => (
          <tr key={b.id}>
            <td>{b.date}</td>
            <td>{b.service}</td>
            <td>{b.ownerId}</td>
            <td>
              <span className={`badge ${b.status}`}>{b.status}</span>
            </td>
            <td className="num">{rupiah(b.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
