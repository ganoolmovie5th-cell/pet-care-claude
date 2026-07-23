import { Booking } from '@/lib/api';

const STATUS_STYLES: Record<Booking['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<Booking['status'], string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const date = new Date(booking.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{booking.serviceName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {booking.petName} · {booking.ownerName}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {date} {booking.time}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            Rp {booking.amount.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">ID: {booking.id}</p>
    </div>
  );
}
