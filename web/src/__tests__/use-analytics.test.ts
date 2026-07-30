// Factory mock so jest never parses the real module: it uses import.meta.env,
// which the CJS test transform cannot handle.
jest.mock('../services/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import api from '../services/api';
import { useAnalytics, readQueue, writeQueue } from '../hooks/use-analytics';

const mockedPost = api.post as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('logEvent writes event to localStorage queue', () => {
  const { logEvent } = useAnalytics();
  logEvent('app_opened', { source: 'home' });

  const queue = readQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].type).toBe('app_opened');
  expect(queue[0].metadata).toEqual({ source: 'home' });
});

test('flushEvents sends queued events via POST and clears queue', async () => {
  mockedPost.mockResolvedValue({ status: 200 });

  const { logEvent, flushEvents } = useAnalytics();
  logEvent('booking_created', { bookingId: 'b1' });
  logEvent('vet_viewed', { vetId: 'v1' });

  await flushEvents();

  expect(mockedPost).toHaveBeenCalledTimes(2);
  expect(mockedPost).toHaveBeenCalledWith('/analytics/event', {
    eventType: 'booking_created',
    metadata: { bookingId: 'b1' },
  });
  expect(readQueue()).toHaveLength(0);
});

test('flushEvents retains queue on POST failure for retry', async () => {
  mockedPost.mockRejectedValueOnce(new Error('network error'));

  writeQueue([{ type: 'vet_viewed', metadata: {}, timestamp: Date.now() }]);

  const { flushEvents } = useAnalytics();
  await flushEvents();

  expect(readQueue()).toHaveLength(1);
});

test('flushEvents drops only accepted events when a later POST fails', async () => {
  mockedPost
    .mockResolvedValueOnce({ status: 200 })
    .mockRejectedValueOnce(new Error('network error'));

  writeQueue([
    { type: 'booking_created', metadata: {}, timestamp: Date.now() },
    { type: 'vet_viewed', metadata: {}, timestamp: Date.now() },
  ]);

  const { flushEvents } = useAnalytics();
  await flushEvents();

  const queue = readQueue();
  expect(queue).toHaveLength(1);
  expect(queue[0].type).toBe('vet_viewed');
});
