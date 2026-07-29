// ponytail: services get an in-memory Firestore instead of a bare jest.fn(), so
// query logic is exercised for real without Java/the emulator. Tests seed via
// `(db as unknown as FakeFirestore).seed(...)`.
const { FakeFirestore, FieldValue } = require('./src/__tests__/helpers/fake-firestore');

const fakeDb = new FakeFirestore();

// config/firebase.ts default-exports the admin namespace, and services reach for
// admin.firestore.FieldValue.increment / admin.firestore().batch() through it.
const fakeAdmin = () => fakeDb;
fakeAdmin.FieldValue = FieldValue;

// Push delivery is out of scope for these tests; the send path just needs to resolve.
const fakeMessaging = () => ({
  sendToDevice: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  send: jest.fn().mockResolvedValue('fake-message-id'),
});

jest.mock('./src/config/firebase', () => ({
  __esModule: true,
  default: { firestore: fakeAdmin, messaging: fakeMessaging },
  db: fakeDb,
  auth: {
    verifyIdToken: jest.fn(),
  },
  realtimeDb: {},
  storage: {},
}));

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: { firestore: fakeAdmin, messaging: fakeMessaging },
  firestore: fakeAdmin,
  messaging: fakeMessaging,
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn(), applicationDefault: jest.fn() },
}));

// ponytail: no global reset — jest gives each test file its own module registry,
// so the fake is already fresh per file, and some suites (routes/playdate) carry
// state across `it` blocks on purpose. Suites that need isolation call
// `fake.reset()` in their own beforeEach.
