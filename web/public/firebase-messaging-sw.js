importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js');

// ponytail: FIREBASE_CONFIG replaced at deploy time; SW cannot access import.meta.env
// Set self.FIREBASE_CONFIG before this script loads, or inject via build step
firebase.initializeApp(self.FIREBASE_CONFIG || {});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] background message', payload);
  const title = payload.notification?.title ?? 'Pet Care';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, { body });
});
