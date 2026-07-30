import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import sgMail from '@sendgrid/mail';

const ADMIN_HEADER = 'Bearer admin-token';

beforeEach(() => {
  jest.clearAllMocks();
  (auth.verifyIdToken as jest.Mock).mockResolvedValue({
    uid: 'admin-1',
    customClaims: { admin: true },
  });
});

describe('POST /email/booking-confirmation', () => {
  it('sends booking confirmation and returns success', async () => {
    const res = await request(app)
      .post('/email/booking-confirmation')
      .set('Authorization', ADMIN_HEADER)
      .send({
        ownerId: 'owner-1',
        ownerEmail: 'owner@example.com',
        booking: { id: 'b-1', petName: 'Rex', vetName: 'Dr. Smith', date: '2026-08-01', time: '10:00' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    const msg = (sgMail.send as jest.Mock).mock.calls[0][0];
    expect(msg.to).toBe('owner@example.com');
    expect(msg.subject).toContain('Booking Confirmed');
  });

  it('rejects a non-admin caller with 403', async () => {
    (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'owner-1', customClaims: {} });

    const res = await request(app)
      .post('/email/booking-confirmation')
      .set('Authorization', 'Bearer owner-token')
      .send({ ownerEmail: 'owner@example.com', booking: { id: 'b-1' } });

    expect(res.status).toBe(403);
    expect(sgMail.send).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app)
      .post('/email/booking-confirmation')
      .send({ ownerEmail: 'owner@example.com', booking: { id: 'b-1' } });

    expect(res.status).toBe(401);
    expect(sgMail.send).not.toHaveBeenCalled();
  });
});

describe('POST /email/payment-receipt', () => {
  it('sends payment receipt and returns success', async () => {
    const res = await request(app)
      .post('/email/payment-receipt')
      .set('Authorization', ADMIN_HEADER)
      .send({
        vetEmail: 'vet@example.com',
        invoice: { id: 'inv-1', amount: 150000, currency: 'IDR', description: 'Consultation', date: '2026-07-24' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    const msg = (sgMail.send as jest.Mock).mock.calls[0][0];
    expect(msg.to).toBe('vet@example.com');
    expect(msg.subject).toContain('inv-1');
  });
});

describe('POST /email/subscription-reminder', () => {
  it('sends subscription reminder and returns success', async () => {
    const res = await request(app)
      .post('/email/subscription-reminder')
      .set('Authorization', ADMIN_HEADER)
      .send({ vetEmail: 'vet@example.com', vetName: 'Dr. Siti', daysUntilExpiry: 7 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    const msg = (sgMail.send as jest.Mock).mock.calls[0][0];
    expect(msg.to).toBe('vet@example.com');
    expect(msg.subject).toContain('7 days');
  });
});
