import {
  createBooking,
  getBookingById,
  getBookingsByOwnerId,
  updateBookingStatus,
  updatePaymentStatus,
} from '../../services/booking';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const bookingInput = (over: Record<string, unknown> = {}) => ({
  ownerId: 'owner-1',
  petId: 'pet-1',
  vetId: 'vet-1',
  date: '2026-08-01',
  time: '10:00',
  status: 'pending' as const,
  payment_status: 'pending' as const,
  ...over,
});

describe('Booking Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('createBooking', () => {
    it('returns the new id and stamps created_at', async () => {
      const id = await createBooking(bookingInput({ notes: 'first visit' }));

      const stored = fake.raw('bookings', id) as Record<string, string>;
      expect(stored.ownerId).toBe('owner-1');
      expect(stored.notes).toBe('first visit');
      expect(Date.parse(stored.created_at)).not.toBeNaN();
    });
  });

  describe('getBookingById', () => {
    it('returns the booking with its id attached', async () => {
      const id = await createBooking(bookingInput());

      await expect(getBookingById(id)).resolves.toMatchObject({
        id,
        vetId: 'vet-1',
        status: 'pending',
      });
    });

    it('returns null for an unknown id', async () => {
      await expect(getBookingById('missing')).resolves.toBeNull();
    });
  });

  describe('getBookingsByOwnerId', () => {
    it('returns only the bookings of that owner', async () => {
      fake.seed('bookings', {
        'mine-1': bookingInput(),
        'mine-2': bookingInput({ date: '2026-08-02' }),
        theirs: bookingInput({ ownerId: 'owner-2' }),
      });

      const bookings = await getBookingsByOwnerId('owner-1');
      expect(bookings.map(b => b.id).sort()).toEqual(['mine-1', 'mine-2']);
    });

    it('returns an empty array when the owner has none', async () => {
      await expect(getBookingsByOwnerId('owner-nobody')).resolves.toEqual([]);
    });
  });

  describe('updateBookingStatus', () => {
    it('changes status and leaves payment_status alone', async () => {
      const id = await createBooking(bookingInput());

      await updateBookingStatus(id, 'confirmed');

      expect(fake.raw('bookings', id)).toMatchObject({
        status: 'confirmed',
        payment_status: 'pending',
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('changes payment_status and leaves status alone', async () => {
      const id = await createBooking(bookingInput());

      await updatePaymentStatus(id, 'paid');

      expect(fake.raw('bookings', id)).toMatchObject({
        status: 'pending',
        payment_status: 'paid',
      });
    });

    it('rejects when the booking does not exist', async () => {
      await expect(updatePaymentStatus('missing', 'paid')).rejects.toThrow();
    });
  });
});
