import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from './firebase-config';

const FCM_TOKEN_KEY = 'fcm_token';

// ponytail: single lazy init — avoids duplicate app if Firebase used elsewhere later
function getFirebaseMessaging(): Messaging {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export async function getFCMToken(): Promise<string | null> {
  const messaging = getFirebaseMessaging();
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (token) {
    localStorage.setItem(FCM_TOKEN_KEY, token);
  }
  return token || null;
}

export async function initializeMessaging(): Promise<void> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const token = await getFCMToken();
  if (!token) return;

  const messaging = getFirebaseMessaging();
  onMessage(messaging, (payload) => {
    // ponytail: browser Notification API for foreground; background handled by SW
    const title = payload.notification?.title ?? 'Pet Care';
    const body = payload.notification?.body ?? '';
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  });
}
