import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  logEvent: jest.fn(),
  getDailyMetrics: jest.fn(),
  getMetricsRange: jest.fn(),
}));

jest.mock('../src/queues/analyticsQueue', () => ({
  enqueueAnalyticsTask: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as analyticsService from '../src/services/analytics';
import * as analyticsQueue from '../src/queues/analyticsQueue';

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

describe('POST /analytics/event', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should log app_opened event', async () => {
    asUser('user-1');
    (analyticsService.logAnalyticsEvent as jest.Mock).mockResolvedValue('evt-001');

    const res = await request(app)
      .post('/analytics/event')
      .set('Authorization', 'Bearer token-1')
      .send({ eventType: 'app_opened' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, eventId: 'evt-001' });
    expect(analyticsService.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'app_opened', userId: 'user-1' })
    );
    expect(analyticsQueue.enqueueAnalyticsTask).not.toHaveBeenCalled();
  });

  it('should log booking_created event with metadata', async () => {
    asUser('user-2');
    (analyticsService.logAnalyticsEvent as jest.Mock).mockResolvedValue('evt-002');

    const res = await request(app)
      .post('/analytics/event')
      .set('Authorization', 'Bearer token-2')
      .send({ eventType: 'booking_created', metadata: { bookingId: 'b-99' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, eventId: 'evt-002' });
    expect(analyticsService.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'booking_created', metadata: { bookingId: 'b-99' } })
    );
  });

  it('should reject invalid event type with 400', async () => {
    asUser('user-3');

    const res = await request(app)
      .post('/analytics/event')
      .set('Authorization', 'Bearer token-3')
      .send({ eventType: 'invalid_event' });

    expect(res.status).toBe(400);
    expect(analyticsService.logAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject an unauthenticated request with 401', async () => {
    const res = await request(app).post('/analytics/event').send({ eventType: 'app_opened' });

    expect(res.status).toBe(401);
    expect(analyticsService.logAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should enqueue a follow-up task for a critical event', async () => {
    asUser('user-4');
    (analyticsService.logAnalyticsEvent as jest.Mock).mockResolvedValue('evt-004');

    const res = await request(app)
      .post('/analytics/event')
      .set('Authorization', 'Bearer token-4')
      .send({ eventType: 'payment_completed', metadata: { invoiceId: 'inv-1' } });

    expect(res.status).toBe(200);
    expect(analyticsQueue.enqueueAnalyticsTask).toHaveBeenCalledWith(
      'evt-004',
      'payment_completed',
    );
  });
});

const asAdmin = () =>
  (auth.verifyIdToken as jest.Mock).mockResolvedValue({
    uid: 'admin-1',
    customClaims: { admin: true },
  });

describe('GET /analytics/metrics/daily/:date', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the metrics of the requested day to an admin', async () => {
    asAdmin();
    (analyticsService.getDailyMetrics as jest.Mock).mockResolvedValue({
      date: '2026-07-30',
      bookings: 12,
      revenue: 1500000,
    });

    const res = await request(app)
      .get('/analytics/metrics/daily/2026-07-30')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(analyticsService.getDailyMetrics).toHaveBeenCalledWith('2026-07-30');
  });

  it('rejects a non-admin caller with 403', async () => {
    asUser('user-1');

    const res = await request(app)
      .get('/analytics/metrics/daily/2026-07-30')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
    expect(analyticsService.getDailyMetrics).not.toHaveBeenCalled();
  });
});

describe('GET /analytics/metrics/range', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the range to an admin', async () => {
    asAdmin();
    (analyticsService.getMetricsRange as jest.Mock).mockResolvedValue([
      { date: '2026-07-30', bookings: 12, revenue: 1500000 },
    ]);

    const res = await request(app)
      .get('/analytics/metrics/range?startDate=2026-07-01&endDate=2026-07-30')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(analyticsService.getMetricsRange).toHaveBeenCalledWith('2026-07-01', '2026-07-30');
  });

  it('rejects a request without an endDate with 400', async () => {
    asAdmin();

    const res = await request(app)
      .get('/analytics/metrics/range?startDate=2026-07-01')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(400);
    expect(analyticsService.getMetricsRange).not.toHaveBeenCalled();
  });

  it('rejects a non-admin caller with 403', async () => {
    asUser('user-1');

    const res = await request(app)
      .get('/analytics/metrics/range?startDate=2026-07-01&endDate=2026-07-30')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(403);
    expect(analyticsService.getMetricsRange).not.toHaveBeenCalled();
  });
});

describe('POST /analytics/insurance-click', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs the click against the caller', async () => {
    asUser('user-1');

    const res = await request(app)
      .post('/analytics/insurance-click')
      .set('Authorization', 'Bearer user-token')
      .send({ providerName: 'Asuransi Test' });

    expect(res.status).toBe(201);
    expect(analyticsService.logEvent).toHaveBeenCalledWith('user-1', 'insurance_clicked', {
      providerName: 'Asuransi Test',
    });
  });

  it('rejects a request without a providerName with 400', async () => {
    asUser('user-1');

    const res = await request(app)
      .post('/analytics/insurance-click')
      .set('Authorization', 'Bearer user-token')
      .send({});

    expect(res.status).toBe(400);
    expect(analyticsService.logEvent).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app)
      .post('/analytics/insurance-click')
      .send({ providerName: 'Asuransi Test' });

    expect(res.status).toBe(401);
    expect(analyticsService.logEvent).not.toHaveBeenCalled();
  });
});
