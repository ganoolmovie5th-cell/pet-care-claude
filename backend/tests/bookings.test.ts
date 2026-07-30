import request from 'supertest';

const mockGet = jest.fn();

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockGet })),
    })),
  },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/booking', () => ({
  createBooking: jest.fn(),
  getBookingsByOwnerId: jest.fn(),
}));

jest.mock('../src/services/vet', () => ({
  getVetById: jest.fn(),
}));

jest.mock('../src/services/health', () => ({
  getPetsByOwnerId: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  sendBookingConfirmationSMS: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as bookingService from '../src/services/booking';
import * as vetService from '../src/services/vet';
import * as healthService from '../src/services/health';
import * as notifications from '../src/services/notifications';

const body = { petId: 'pet-1', vetId: 'vet-1', date: '2026-08-14', time: '09:00' };

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (bookingService.createBooking as jest.Mock).mockResolvedValue('b-1');
  (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([{ id: 'pet-1', name: 'Miko' }]);
  (vetService.getVetById as jest.Mock).mockResolvedValue({ clinic_name: 'Klinik Test' });
  mockGet.mockResolvedValue({ data: () => ({ phone: '+628123456789' }) });
});

describe('POST /bookings', () => {
  const post = (payload: Record<string, unknown>) =>
    request(app).post('/bookings').set('Authorization', 'Bearer owner-token').send(payload);

  it('creates the booking with the caller as owner and sends the SMS', async () => {
    asUser('owner-1');

    const res = await post({ ...body, notes: 'Vaksin tahunan' });

    expect(res.status).toBe(201);
    expect(bookingService.createBooking).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      petId: 'pet-1',
      vetId: 'vet-1',
      date: '2026-08-14',
      time: '09:00',
      notes: 'Vaksin tahunan',
      status: 'pending',
      payment_status: 'pending',
    });
    expect(notifications.sendBookingConfirmationSMS).toHaveBeenCalledWith(
      '+628123456789',
      'Miko',
      'Klinik Test',
      '2026-08-14',
    );
  });

  it('ignores an ownerId sent in the body', async () => {
    asUser('owner-1');

    await post({ ...body, ownerId: 'someone-else' });

    expect(bookingService.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1' }),
    );
  });

  it('rejects booking a pet the caller does not own with 403', async () => {
    asUser('intruder-9');
    (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([]);

    const res = await post(body);

    expect(res.status).toBe(403);
    expect(bookingService.createBooking).not.toHaveBeenCalled();
  });

  it('rejects a request without a time with 400', async () => {
    asUser('owner-1');

    const res = await post({ petId: 'pet-1', vetId: 'vet-1', date: '2026-08-14' });

    expect(res.status).toBe(400);
    expect(bookingService.createBooking).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/bookings').send(body);

    expect(res.status).toBe(401);
    expect(bookingService.createBooking).not.toHaveBeenCalled();
  });

  it('still creates the booking when the SMS fails', async () => {
    asUser('owner-1');
    (notifications.sendBookingConfirmationSMS as jest.Mock).mockRejectedValue(
      new Error('twilio down'),
    );

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(bookingService.createBooking).toHaveBeenCalled();
  });

  it('skips the SMS when the user has no phone number', async () => {
    asUser('owner-1');
    mockGet.mockResolvedValue({ data: () => ({}) });

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(notifications.sendBookingConfirmationSMS).not.toHaveBeenCalled();
  });

  it('skips the SMS when the vet is unknown', async () => {
    asUser('owner-1');
    (vetService.getVetById as jest.Mock).mockResolvedValue(null);

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(notifications.sendBookingConfirmationSMS).not.toHaveBeenCalled();
  });
});

describe('GET /bookings/owner/:ownerId', () => {
  it('returns the bookings of the caller', async () => {
    asUser('owner-1');
    (bookingService.getBookingsByOwnerId as jest.Mock).mockResolvedValue([{ id: 'b-1' }]);

    const res = await request(app)
      .get('/bookings/owner/owner-1')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(bookingService.getBookingsByOwnerId).toHaveBeenCalledWith('owner-1');
  });

  it('rejects reading another owner bookings with 403', async () => {
    asUser('intruder-9');

    const res = await request(app)
      .get('/bookings/owner/owner-1')
      .set('Authorization', 'Bearer intruder-token');

    expect(res.status).toBe(403);
    expect(bookingService.getBookingsByOwnerId).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/bookings/owner/owner-1');

    expect(res.status).toBe(401);
    expect(bookingService.getBookingsByOwnerId).not.toHaveBeenCalled();
  });
});
