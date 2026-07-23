import axios from 'axios';
import { useAnalytics, readQueue, writeQueue } from '../hooks/use-analytics';

jest.mock('axios');
const mockedPost = jest.spyOn(axios, 'post');

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
  mockedPost.mockResolvedValueOnce({ status: 200 });

  const { logEvent, flushEvents } = useAnalytics();
  logEvent('booking_created', { bookingId: 'b1' });
  logEvent('vet_viewed', { vetId: 'v1' });

  await flushEvents();

  expect(mockedPost).toHaveBeenCalledWith(
    'http://localhost:5000/analytics/event',
    expect.objectContaining({ events: expect.arrayContaining([expect.objectContaining({ type: 'booking_created' })]) }),
  );
  expect(readQueue()).toHaveLength(0);
});

test('flushEvents retains queue on POST failure for retry', async () => {
  mockedPost.mockRejectedValueOnce(new Error('network error'));

  writeQueue([{ type: 'vet_viewed', metadata: {}, timestamp: Date.now() }]);

  const { flushEvents } = useAnalytics();
  await flushEvents();

  expect(readQueue()).toHaveLength(1);
});
