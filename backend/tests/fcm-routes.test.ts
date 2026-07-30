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

jest.mock('../src/services/notifications', () => ({
  registerFCMToken: jest.fn(),
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as notifications from '../src/services/notifications';

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (notifications.registerFCMToken as jest.Mock).mockResolvedValue('tok-1');
  (notifications.getUserNotifications as jest.Mock).mockResolvedValue({
    notifications: [{ id: 'notif-1' }],
    total: 1,
  });
  mockGet.mockResolvedValue({ exists: true, data: () => ({ userId: 'owner-1', read: false }) });
});

describe('POST /fcm/register-token', () => {
  it('registers the token against the caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/fcm/register-token')
      .set('Authorization', 'Bearer owner-token')
      .send({ token: 'fcm-token-abc', device: 'Android' });

    expect(res.status).toBe(201);
    expect(notifications.registerFCMToken).toHaveBeenCalledWith(
      'owner-1',
      'fcm-token-abc',
      'Android',
    );
  });

  it('rejects a request without a device with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/fcm/register-token')
      .set('Authorization', 'Bearer owner-token')
      .send({ token: 'fcm-token-abc' });

    expect(res.status).toBe(400);
    expect(notifications.registerFCMToken).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app)
      .post('/fcm/register-token')
      .send({ token: 'fcm-token-abc', device: 'iOS' });

    expect(res.status).toBe(401);
    expect(notifications.registerFCMToken).not.toHaveBeenCalled();
  });
});

describe('GET /fcm/notifications', () => {
  it('applies the default paging arguments', async () => {
    asUser('owner-1');

    const res = await request(app)
      .get('/fcm/notifications')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(notifications.getUserNotifications).toHaveBeenCalledWith('owner-1', false, 20, 0);
  });

  it('passes the unreadOnly filter and paging from the query string', async () => {
    asUser('owner-1');

    await request(app)
      .get('/fcm/notifications?unreadOnly=true&limit=5&offset=10')
      .set('Authorization', 'Bearer owner-token');

    expect(notifications.getUserNotifications).toHaveBeenCalledWith('owner-1', true, 5, 10);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/fcm/notifications');

    expect(res.status).toBe(401);
    expect(notifications.getUserNotifications).not.toHaveBeenCalled();
  });
});

describe('PATCH /fcm/notifications/:notificationId/read', () => {
  const patch = (token: string) =>
    request(app).patch('/fcm/notifications/notif-1/read').set('Authorization', `Bearer ${token}`);

  it('marks the notification read for its owner', async () => {
    asUser('owner-1');

    const res = await patch('owner-token');

    expect(res.status).toBe(200);
    expect(notifications.markNotificationAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('hides another user notification behind a 404', async () => {
    asUser('intruder-9');

    const res = await patch('intruder-token');

    expect(res.status).toBe(404);
    expect(notifications.markNotificationAsRead).not.toHaveBeenCalled();
  });

  it('returns 404 for a notification that does not exist', async () => {
    asUser('owner-1');
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });

    const res = await patch('owner-token');

    expect(res.status).toBe(404);
    expect(notifications.markNotificationAsRead).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).patch('/fcm/notifications/notif-1/read');

    expect(res.status).toBe(401);
    expect(notifications.markNotificationAsRead).not.toHaveBeenCalled();
  });
});
