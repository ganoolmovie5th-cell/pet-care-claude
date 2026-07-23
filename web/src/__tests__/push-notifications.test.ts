import { initializeMessaging, getFCMToken } from '../services/push-notifications';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));

const mockGetToken = jest.fn();
const mockOnMessage = jest.fn();
jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: (...args: unknown[]) => mockGetToken(...args),
  onMessage: (...args: unknown[]) => mockOnMessage(...args),
}));

const mockRegister = jest.fn();
const mockReady = Promise.resolve({ active: {} });
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: { register: mockRegister, ready: mockReady },
  writable: true,
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  Object.defineProperty(global, 'Notification', {
    value: { permission: 'granted', requestPermission: jest.fn().mockResolvedValue('granted') },
    writable: true,
    configurable: true,
  });
});

test('getFCMToken stores token in localStorage', async () => {
  mockGetToken.mockResolvedValue('test-token-123');
  const token = await getFCMToken();
  expect(token).toBe('test-token-123');
  expect(localStorage.getItem('fcm_token')).toBe('test-token-123');
});

test('getFCMToken returns null when no token returned', async () => {
  mockGetToken.mockResolvedValue('');
  const token = await getFCMToken();
  expect(token).toBeNull();
});

test('initializeMessaging registers SW and subscribes foreground handler', async () => {
  mockGetToken.mockResolvedValue('token-abc');
  mockRegister.mockResolvedValue({});

  await initializeMessaging();

  expect(mockRegister).toHaveBeenCalledWith('/firebase-messaging-sw.js');
  expect(mockOnMessage).toHaveBeenCalled();
});

test('initializeMessaging exits early when permission denied', async () => {
  Object.defineProperty(global, 'Notification', {
    value: { permission: 'denied', requestPermission: jest.fn().mockResolvedValue('denied') },
    writable: true,
    configurable: true,
  });

  await initializeMessaging();

  expect(mockRegister).not.toHaveBeenCalled();
});
