import { db } from '../../config/firebase';
import {
  registerFCMToken,
  getFCMTokensByUserId,
  removeFCMToken,
  sendFCMNotification,
  getUserNotifications,
  markNotificationAsRead,
} from '../../services/notifications';

jest.mock('../../config/firebase');
jest.mock('@react-native-firebase/messaging');

describe('Notifications Service', () => {
  describe('registerFCMToken', () => {
    it('saves FCM token with device type', async () => {
      const docRef = await registerFCMToken('user-123', 'token-abc', 'iOS');
      expect(docRef).toBeDefined();
      expect(typeof docRef).toBe('string');
    });

    it('sets created_at timestamp', async () => {
      const docId = await registerFCMToken('user-456', 'token-xyz', 'Android');
      const doc = await db.collection('fcm_tokens').doc(docId).get();
      expect(doc.data()?.created_at).toBeDefined();
    });
  });

  describe('getFCMTokensByUserId', () => {
    it('returns empty array when user has no tokens', async () => {
      const tokens = await getFCMTokensByUserId('user-no-tokens');
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('returns all tokens for user', async () => {
      const userId = 'user-multi-token';
      await registerFCMToken(userId, 'token-1', 'iOS');
      await registerFCMToken(userId, 'token-2', 'Android');

      const tokens = await getFCMTokensByUserId(userId);
      expect(tokens.length).toBe(2);
      expect(tokens).toContain('token-1');
      expect(tokens).toContain('token-2');
    });
  });

  describe('removeFCMToken', () => {
    it('removes token from database', async () => {
      const userId = 'user-remove-test';
      await registerFCMToken(userId, 'token-remove', 'iOS');

      await removeFCMToken('token-remove');
      const tokens = await getFCMTokensByUserId(userId);
      expect(tokens).not.toContain('token-remove');
    });
  });

  describe('sendFCMNotification', () => {
    it('saves notification to Firestore', async () => {
      await sendFCMNotification(
        'user-123',
        'booking',
        'Test Title',
        'Test Body',
        { bookingId: 'booking-123' },
        'app://booking/123'
      );

      const snapshot = await db
        .collection('user_notifications')
        .where('userId', '==', 'user-123')
        .get();
      expect(snapshot.docs.length).toBeGreaterThan(0);
    });

    it('stores all notification fields', async () => {
      const data = { bookingId: 'b-1' };
      const deeplink = 'app://test';

      await sendFCMNotification(
        'user-test',
        'reminder',
        'Reminder Title',
        'Reminder Body',
        data,
        deeplink
      );

      const snapshot = await db
        .collection('user_notifications')
        .where('userId', '==', 'user-test')
        .get();

      const notif = snapshot.docs[0].data();
      expect(notif.type).toBe('reminder');
      expect(notif.title).toBe('Reminder Title');
      expect(notif.body).toBe('Reminder Body');
      expect(notif.deeplink).toBe(deeplink);
      expect(notif.data).toEqual(data);
      expect(notif.sent_at).toBeDefined();
      expect(notif.read_at).toBeNull();
    });

    it('supports all notification types', async () => {
      const types: ('booking' | 'playdate_match' | 'reminder' | 'message')[] = [
        'booking',
        'playdate_match',
        'reminder',
        'message',
      ];

      for (const type of types) {
        await sendFCMNotification('user-type-test', type, 'Title', 'Body');
      }

      const snapshot = await db
        .collection('user_notifications')
        .where('userId', '==', 'user-type-test')
        .get();

      expect(snapshot.docs.length).toBe(4);
    });
  });

  describe('getUserNotifications', () => {
    it('returns notifications ordered by sent_at descending', async () => {
      const userId = 'user-order-test';
      await sendFCMNotification(userId, 'booking', 'First', 'Body 1');
      await new Promise(resolve => setTimeout(resolve, 100));
      await sendFCMNotification(userId, 'reminder', 'Second', 'Body 2');

      const result = await getUserNotifications(userId);
      expect(result.notifications.length).toBeGreaterThanOrEqual(2);
      expect(result.notifications[0].title).toBe('Second');
    });

    it('respects limit parameter', async () => {
      const userId = 'user-limit-test';
      for (let i = 0; i < 5; i++) {
        await sendFCMNotification(userId, 'booking', `Notif ${i}`, `Body ${i}`);
      }

      const limited = await getUserNotifications(userId, false, 2, 0);
      expect(limited.notifications.length).toBeLessThanOrEqual(2);
    });

    it('filters unread notifications when unreadOnly=true', async () => {
      const userId = 'user-unread-test';
      const notifId1 = (
        await db.collection('user_notifications').add({
          userId,
          type: 'booking',
          title: 'Unread',
          body: 'Body',
          sent_at: new Date().toISOString(),
          read_at: null,
        })
      ).id;

      const unread = await getUserNotifications(userId, true);
      expect(unread.notifications.some(n => n.id === notifId1)).toBe(true);
    });

    it('includes total count', async () => {
      const userId = 'user-count-test';
      for (let i = 0; i < 3; i++) {
        await sendFCMNotification(userId, 'booking', `Notif ${i}`, `Body`);
      }

      const result = await getUserNotifications(userId);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('markNotificationAsRead', () => {
    it('sets read_at timestamp', async () => {
      const userId = 'user-read-test';
      const notifId = (
        await db.collection('user_notifications').add({
          userId,
          type: 'booking',
          title: 'Test',
          body: 'Body',
          sent_at: new Date().toISOString(),
          read_at: null,
        })
      ).id;

      await markNotificationAsRead(notifId);

      const doc = await db.collection('user_notifications').doc(notifId).get();
      expect(doc.data()?.read_at).toBeDefined();
      expect(doc.data()?.read_at).not.toBeNull();
    });
  });
});
