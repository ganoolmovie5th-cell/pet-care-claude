import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/payment', () => ({
  createPaymentInvoice: jest.fn(),
  getInvoiceById: jest.fn(),
  getInvoiceByBookingId: jest.fn(),
  updateInvoiceStatus: jest.fn(),
}));

jest.mock('../src/services/booking', () => ({
  updatePaymentStatus: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as paymentService from '../src/services/payment';
import * as bookingService from '../src/services/booking';

const invoice = {
  id: 'inv-1',
  bookingId: 'b-1',
  userId: 'owner-1',
  amount: 150000,
  status: 'PENDING',
  paidAt: null,
};

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.XENDIT_CALLBACK_TOKEN = 'callback-secret';
});

describe('POST /payments/create-invoice', () => {
  it('creates an invoice for the authenticated caller', async () => {
    asUser('owner-1');
    (paymentService.createPaymentInvoice as jest.Mock).mockResolvedValue(invoice);

    const res = await request(app)
      .post('/payments/create-invoice')
      .set('Authorization', 'Bearer owner-token')
      .send({ bookingId: 'b-1', amount: 150000, description: 'Konsultasi' });

    expect(res.status).toBe(201);
    expect(paymentService.createPaymentInvoice).toHaveBeenCalledWith(
      'b-1',
      'owner-1',
      150000,
      'Konsultasi',
    );
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app)
      .post('/payments/create-invoice')
      .send({ bookingId: 'b-1', amount: 150000 });

    expect(res.status).toBe(401);
    expect(paymentService.createPaymentInvoice).not.toHaveBeenCalled();
  });

  it('rejects a request without an amount with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/payments/create-invoice')
      .set('Authorization', 'Bearer owner-token')
      .send({ bookingId: 'b-1' });

    expect(res.status).toBe(400);
    expect(paymentService.createPaymentInvoice).not.toHaveBeenCalled();
  });
});

describe('GET /payments/invoice/:invoiceId', () => {
  it('returns the invoice to its owner', async () => {
    asUser('owner-1');
    (paymentService.getInvoiceById as jest.Mock).mockResolvedValue(invoice);

    const res = await request(app)
      .get('/payments/invoice/inv-1')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('inv-1');
  });

  it('hides another user invoice behind a 404', async () => {
    asUser('intruder-9');
    (paymentService.getInvoiceById as jest.Mock).mockResolvedValue(invoice);

    const res = await request(app)
      .get('/payments/invoice/inv-1')
      .set('Authorization', 'Bearer intruder-token');

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('amount');
  });
});

describe('GET /payments/booking/:bookingId/status', () => {
  it('returns the payment status to the invoice owner', async () => {
    asUser('owner-1');
    (paymentService.getInvoiceByBookingId as jest.Mock).mockResolvedValue({
      ...invoice,
      status: 'PAID',
      paidAt: '2026-07-30T09:00:00.000Z',
    });

    const res = await request(app)
      .get('/payments/booking/b-1/status')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'PAID', paidAt: '2026-07-30T09:00:00.000Z' });
  });

  it('returns 404 when no invoice exists for the booking', async () => {
    asUser('owner-1');
    (paymentService.getInvoiceByBookingId as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/payments/booking/b-404/status')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /payments/xendit-webhook', () => {
  const paidBody = {
    external_id: 'booking_b-1',
    status: 'PAID',
    paid_at: '2026-07-30T09:00:00.000Z',
  };

  it('marks the booking paid for a valid callback token', async () => {
    (paymentService.getInvoiceByBookingId as jest.Mock).mockResolvedValue(invoice);

    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'callback-secret')
      .send(paidBody);

    expect(res.status).toBe(200);
    expect(paymentService.updateInvoiceStatus).toHaveBeenCalledWith(
      'inv-1',
      'PAID',
      '2026-07-30T09:00:00.000Z',
    );
    expect(bookingService.updatePaymentStatus).toHaveBeenCalledWith('b-1', 'paid');
  });

  it('leaves the booking untouched for a non-PAID status', async () => {
    (paymentService.getInvoiceByBookingId as jest.Mock).mockResolvedValue(invoice);

    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'callback-secret')
      .send({ ...paidBody, status: 'EXPIRED' });

    expect(res.status).toBe(200);
    expect(bookingService.updatePaymentStatus).not.toHaveBeenCalled();
  });

  it('rejects a wrong callback token with 401', async () => {
    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'wrong-token')
      .send(paidBody);

    expect(res.status).toBe(401);
    expect(paymentService.updateInvoiceStatus).not.toHaveBeenCalled();
  });

  it('rejects a missing callback token with 401', async () => {
    const res = await request(app).post('/payments/xendit-webhook').send(paidBody);

    expect(res.status).toBe(401);
    expect(paymentService.updateInvoiceStatus).not.toHaveBeenCalled();
  });

  it('rejects every callback when the server has no token configured', async () => {
    delete process.env.XENDIT_CALLBACK_TOKEN;

    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'callback-secret')
      .send(paidBody);

    expect(res.status).toBe(401);
    expect(paymentService.updateInvoiceStatus).not.toHaveBeenCalled();
  });

  it('rejects a body without external_id with 400', async () => {
    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'callback-secret')
      .send({ status: 'PAID' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the invoice is unknown', async () => {
    (paymentService.getInvoiceByBookingId as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/payments/xendit-webhook')
      .set('x-callback-token', 'callback-secret')
      .send(paidBody);

    expect(res.status).toBe(404);
    expect(paymentService.updateInvoiceStatus).not.toHaveBeenCalled();
  });
});
