import { useEffect } from 'react';
import { useAnalytics } from '../hooks/use-analytics';

interface Props {
  bookingId: string;
  vetId: string;
  isNewBooking?: boolean;
}

export default function BookingDetailScreen({ bookingId, vetId, isNewBooking = false }: Props) {
  const { logEvent } = useAnalytics();

  useEffect(() => {
    logEvent('vet_viewed', { vetId });
    if (isNewBooking) {
      logEvent('booking_created', { bookingId, vetId });
    }
  }, [bookingId, vetId, isNewBooking]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Booking Detail</h1>
      <p>Booking: {bookingId}</p>
      <p>Vet: {vetId}</p>
    </div>
  );
}
