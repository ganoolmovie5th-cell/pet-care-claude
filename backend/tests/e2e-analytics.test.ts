import request from 'supertest';
import app from '../src/index';

describe('Analytics E2E Flow', () => {
  const userId = 'test-user-123';
  const vetId = 'test-vet-456';

  it('should log app_opened event', async () => {
    const res = await request(app)
      .post('/analytics/event')
      .send({ eventType: 'app_opened', userId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('eventId');
  });

  it('should log booking_created event with metadata', async () => {
    const res = await request(app)
      .post('/analytics/event')
      .send({
        eventType: 'booking_created',
        userId,
        vetId,
        metadata: { amount: 250000 },
      });

    expect(res.status).toBe(200);
  });

  it('should log payment_completed event', async () => {
    const res = await request(app)
      .post('/analytics/event')
      .send({
        eventType: 'payment_completed',
        userId,
        vetId,
        metadata: { amount: 250000, invoiceId: 'inv-123' },
      });

    expect(res.status).toBe(200);
  });
});
