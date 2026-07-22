import { db } from '../config/firebase';

export interface Booking {
  id: string;
  ownerId: string;
  petId: string;
  vetId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string;
  created_at: string;
}

export const createBooking = async (booking: Omit<Booking, 'id' | 'created_at'>): Promise<string> => {
  const docRef = await db.collection('bookings').add({
    ...booking,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  const doc = await db.collection('bookings').doc(bookingId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Booking;
};

export const getBookingsByOwnerId = async (ownerId: string): Promise<Booking[]> => {
  const snapshot = await db.collection('bookings').where('ownerId', '==', ownerId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const updateBookingStatus = async (
  bookingId: string,
  status: Booking['status']
): Promise<void> => {
  await db.collection('bookings').doc(bookingId).update({ status });
};

export const updatePaymentStatus = async (
  bookingId: string,
  payment_status: Booking['payment_status']
): Promise<void> => {
  await db.collection('bookings').doc(bookingId).update({ payment_status });
};
