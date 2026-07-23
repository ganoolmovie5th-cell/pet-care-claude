jest.mock('./src/config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
  auth: {
    verifyIdToken: jest.fn(),
  },
  realtimeDb: {},
  storage: {},
}));
