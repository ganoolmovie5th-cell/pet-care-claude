import { getVetEarnings, getVetBookings } from '../../services/vetEarnings';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

// getVetEarnings buckets "this month" off the wall clock, so the fixtures are
// built relative to now rather than hardcoded.
const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const prevMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

const booking = (over: Record<string, unknown> = {}) => ({
  vetId: 'vet-1',
  ownerId: 'owner-1',
  service: 'checkup',
  amount: 100000,
  date: `${thisMonth}-05`,
  status: 'completed',
  ...over,
});

describe('Vet Earnings Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('getVetEarnings', () => {
    it('sums completed bookings and splits out the current month', async () => {
      fake.seed('bookings', {
        'this-1': booking({ amount: 100000 }),
        'this-2': booking({ amount: 50000, date: `${thisMonth}-20` }),
        'prev-1': booking({ amount: 25000, date: `${prevMonth}-10` }),
      });

      const earnings = await getVetEarnings('vet-1');

      expect(earnings.totalEarnings).toBe(175000);
      expect(earnings.monthlyEarnings).toBe(150000);
      expect(earnings.bookingCount).toBe(3);
      expect(Date.parse(earnings.lastUpdated)).not.toBeNaN();
    });

    it('ignores bookings that are not completed', async () => {
      fake.seed('bookings', {
        done: booking({ amount: 100000 }),
        pending: booking({ amount: 999000, status: 'pending' }),
        cancelled: booking({ amount: 999000, status: 'cancelled' }),
      });

      const earnings = await getVetEarnings('vet-1');
      expect(earnings.totalEarnings).toBe(100000);
      expect(earnings.bookingCount).toBe(1);
    });

    it('ignores bookings belonging to another vet', async () => {
      fake.seed('bookings', {
        mine: booking({ amount: 100000 }),
        theirs: booking({ amount: 999000, vetId: 'vet-2' }),
      });

      expect((await getVetEarnings('vet-1')).totalEarnings).toBe(100000);
    });

    it('treats a missing amount as zero instead of NaN', async () => {
      fake.seed('bookings', {
        'no-amount': booking({ amount: undefined }),
        priced: booking({ amount: 70000 }),
      });

      const earnings = await getVetEarnings('vet-1');
      expect(earnings.totalEarnings).toBe(70000);
      expect(earnings.bookingCount).toBe(2);
    });

    it('returns zeroes for a vet with no bookings', async () => {
      const earnings = await getVetEarnings('vet-empty');

      expect(earnings.totalEarnings).toBe(0);
      expect(earnings.monthlyEarnings).toBe(0);
      expect(earnings.bookingCount).toBe(0);
    });
  });

  describe('getVetBookings', () => {
    it('returns the vet bookings newest first, whatever the status', async () => {
      fake.seed('bookings', {
        old: booking({ date: '2026-01-01' }),
        recent: booking({ date: '2026-06-01', status: 'pending' }),
        newest: booking({ date: '2026-07-01', status: 'cancelled' }),
      });

      const bookings = await getVetBookings('vet-1');

      expect(bookings.map(b => b.id)).toEqual(['newest', 'recent', 'old']);
      expect(bookings[0]).toEqual({
        id: 'newest',
        ownerId: 'owner-1',
        service: 'checkup',
        amount: 100000,
        date: '2026-07-01',
        status: 'cancelled',
      });
    });

    it('respects the limit', async () => {
      fake.seed('bookings', {
        'b-1': booking({ date: '2026-01-01' }),
        'b-2': booking({ date: '2026-02-01' }),
        'b-3': booking({ date: '2026-03-01' }),
      });

      const bookings = await getVetBookings('vet-1', 2);
      expect(bookings.map(b => b.id)).toEqual(['b-3', 'b-2']);
    });

    it('excludes other vets and returns an empty array when there is nothing', async () => {
      fake.seed('bookings', { theirs: booking({ vetId: 'vet-2' }) });

      await expect(getVetBookings('vet-1')).resolves.toEqual([]);
    });
  });
});
