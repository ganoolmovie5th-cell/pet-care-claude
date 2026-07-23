import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
}));

jest.mock('../src/queues/analyticsQueue', () => ({
  enqueueAnalyticsTask: jest.fn(),
}));

import app from '../src/index';
import * as analyticsService from '../src/services/analytics';
import * as analyticsQueue from '../src/queues/analyticsQueue';

describe('POST /analytics/event', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should log app_opened event', async () => {
    (analyticsService.logAnalyticsEvent as jest.Mock).mockResolvedValue('evt-001');

    const res = await request(app)
      .post('/analytics/event')
      .send({ eventType: 'app_opened', userId: 'user-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, eventId: 'evt-001' });
    expect(analyticsService.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'app_opened', userId: 'user-1' })
    );
    expect(analyticsQueue.enqueueAnalyticsTask).not.toHaveBeenCalled();
  });

  it('should log booking_created event with metadata', async () => {
    (analyticsService.logAnalyticsEvent as jest.Mock).mockResolvedValue('evt-002');

    const res = await request(app)
      .post('/analytics/event')
      .send({ eventType: 'booking_created', userId: 'user-2', metadata: { bookingId: 'b-99' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, eventId: 'evt-002' });
    expect(analyticsService.logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'booking_created', metadata: { bookingId: 'b-99' } })
    );
  });

  it('should reject invalid event type with 400', async () => {
    const res = await request(app)
      .post('/analytics/event')
      .send({ eventType: 'invalid_event', userId: 'user-3' });

    expect(res.status).toBe(400);
    expect(analyticsService.logAnalyticsEvent).not.toHaveBeenCalled();
  });
});
