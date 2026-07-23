import { db } from '../config/firebase';

export interface VetEarnings {
  totalEarnings: number;
  monthlyEarnings: number;
  bookingCount: number;
  lastUpdated: string;
}

export interface VetBooking {
  id: string;
  ownerId: string;
  service: string;
  amount: number;
  date: string;
  status: string;
}

export const getVetEarnings = async (vetId: string): Promise<VetEarnings> => {
  const snap = await db.collection('bookings')
    .where('vetId', '==', vetId)
    .where('status', '==', 'completed')
    .get();

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalEarnings = 0;
  let monthlyEarnings = 0;

  snap.docs.forEach(doc => {
    const { amount, date } = doc.data();
    totalEarnings += amount ?? 0;
    if (String(date).startsWith(monthPrefix)) monthlyEarnings += amount ?? 0;
  });

  return { totalEarnings, monthlyEarnings, bookingCount: snap.size, lastUpdated: new Date().toISOString() };
};

export const getVetBookings = async (vetId: string, limit = 50): Promise<VetBooking[]> => {
  const snap = await db.collection('bookings')
    .where('vetId', '==', vetId)
    .orderBy('date', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(doc => {
    const d = doc.data();
    return { id: doc.id, ownerId: d.ownerId, service: d.service, amount: d.amount, date: d.date, status: d.status };
  });
};
