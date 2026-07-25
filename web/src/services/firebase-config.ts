// ponytail: isolated so jest can moduleNameMapper this file to avoid import.meta.env parse errors
export const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

export const firebaseConfig = {
  // Without a placeholder getAuth() throws auth/invalid-api-key at import time
  // and the app white-screens before React can render anything.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'missing-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const vapidKey: string = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';
