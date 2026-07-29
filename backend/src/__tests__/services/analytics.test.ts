import {
  logAnalyticsEvent,
  getEventStats,
  logEvent,
  getDailyMetrics,
  getMetricsRange,
} from '../../services/analytics';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const at = (day: string, hour = '12:00:00') => `${day}T${hour}.000Z`;

const event = (over: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  eventType: 'booking_created',
  timestamp: at('2026-07-20'),
  date: '2026-07-20',
  ...over,
});

describe('Analytics Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('logAnalyticsEvent', () => {
    it('stamps both timestamp and the YYYY-MM-DD date bucket', async () => {
      const id = await logAnalyticsEvent({ eventType: 'screen_view', userId: 'user-1' });

      const doc = fake.raw('analytics_events', id) as Record<string, string>;
      expect(doc.eventType).toBe('screen_view');
      expect(Date.parse(doc.timestamp)).not.toBeNaN();
      expect(doc.date).toBe(doc.timestamp.split('T')[0]);
    });

    it('keeps vetId and metadata passed by the caller', async () => {
      const id = await logAnalyticsEvent({
        eventType: 'payment_completed',
        vetId: 'vet-1',
        metadata: { amount: 150000 },
      });

      expect(fake.raw('analytics_events', id)).toMatchObject({
        vetId: 'vet-1',
        metadata: { amount: 150000 },
      });
    });
  });

  describe('logEvent', () => {
    it('writes a timestamp but no date bucket', async () => {
      const id = await logEvent('user-1', 'insurance_clicked', { partner: 'acme' });

      const doc = fake.raw('analytics_events', id) as Record<string, unknown>;
      expect(doc.eventType).toBe('insurance_clicked');
      expect(doc.date).toBeUndefined();
    });
  });

  describe('getEventStats', () => {
    beforeEach(() => {
      fake.seed('analytics_events', {
        'in-1': event({ userId: 'user-1', date: '2026-07-20' }),
        'in-2': event({ userId: 'user-1', date: '2026-07-21' }),
        'in-3': event({ userId: 'user-2', date: '2026-07-22' }),
        'other-type': event({ userId: 'user-3', eventType: 'screen_view' }),
        'before-range': event({ userId: 'user-4', date: '2026-07-19' }),
        'after-range': event({ userId: 'user-5', date: '2026-07-23' }),
      });
    });

    it('counts events in the inclusive date range and de-duplicates users', async () => {
      const stats = await getEventStats('booking_created', '2026-07-20', '2026-07-22');

      expect(stats).toEqual({ count: 3, uniqueUsers: 2 });
    });

    it('returns zeroes when nothing matches', async () => {
      const stats = await getEventStats('error_occurred', '2026-07-20', '2026-07-22');

      expect(stats).toEqual({ count: 0, uniqueUsers: 0 });
    });

    it('does not count events that carry no userId', async () => {
      fake.reset();
      fake.seed('analytics_events', {
        anon: { eventType: 'booking_created', date: '2026-07-20', timestamp: at('2026-07-20') },
      });

      expect(await getEventStats('booking_created', '2026-07-20', '2026-07-20')).toEqual({
        count: 1,
        uniqueUsers: 0,
      });
    });
  });

  describe('getDailyMetrics', () => {
    it('splits bookings from payments and sums the payment amounts', async () => {
      fake.seed('analytics_events', {
        'b-1': event({ userId: 'user-1', timestamp: at('2026-07-20', '01:00:00') }),
        'b-2': event({ userId: 'user-2', timestamp: at('2026-07-20', '10:00:00') }),
        'p-1': event({
          userId: 'user-1',
          eventType: 'payment_completed',
          timestamp: at('2026-07-20', '11:00:00'),
          metadata: { amount: 150000 },
        }),
        'p-2': event({
          userId: 'user-3',
          eventType: 'payment_completed',
          timestamp: at('2026-07-20', '12:00:00'),
          metadata: { amount: '50000' },
        }),
        'v-1': event({
          userId: 'user-1',
          eventType: 'screen_view',
          timestamp: at('2026-07-20', '13:00:00'),
        }),
      });

      expect(await getDailyMetrics('2026-07-20')).toEqual({
        bookingsCreated: 2,
        paymentsCompleted: 2,
        totalRevenue: 200000,
        uniqueUsers: 3,
      });
    });

    it('treats a missing or unparseable amount as zero revenue', async () => {
      fake.seed('analytics_events', {
        'p-1': event({
          eventType: 'payment_completed',
          timestamp: at('2026-07-20', '09:00:00'),
        }),
        'p-2': event({
          eventType: 'payment_completed',
          timestamp: at('2026-07-20', '09:30:00'),
          metadata: { amount: 'gratis' },
        }),
      });

      const metrics = await getDailyMetrics('2026-07-20');
      expect(metrics.paymentsCompleted).toBe(2);
      expect(metrics.totalRevenue).toBe(0);
    });

    it('returns zeroes for a day with no events', async () => {
      expect(await getDailyMetrics('2026-07-20')).toEqual({
        bookingsCreated: 0,
        paymentsCompleted: 0,
        totalRevenue: 0,
        uniqueUsers: 0,
      });
    });
  });

  describe('getMetricsRange', () => {
    it('returns one entry per day, inclusive of both ends', async () => {
      fake.seed('analytics_events', {
        'b-1': event({ timestamp: at('2026-07-20', '08:00:00') }),
        'b-2': event({ timestamp: at('2026-07-22', '08:00:00') }),
      });

      const range = await getMetricsRange('2026-07-20', '2026-07-22');

      expect(range.map(m => m.date)).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
      expect(range.map(m => m.bookingsCreated)).toEqual([1, 0, 1]);
    });

    it('returns a single day when start equals end', async () => {
      const range = await getMetricsRange('2026-07-20', '2026-07-20');
      expect(range).toHaveLength(1);
    });

    it('returns an empty array when end precedes start', async () => {
      await expect(getMetricsRange('2026-07-22', '2026-07-20')).resolves.toEqual([]);
    });
  });
});
