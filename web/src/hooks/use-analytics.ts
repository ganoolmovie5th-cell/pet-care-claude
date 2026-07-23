import axios from 'axios';

export type EventType =
  | 'app_opened'
  | 'booking_created'
  | 'payment_completed'
  | 'vet_viewed'
  | 'dispute_opened';

export interface AnalyticsEvent {
  type: EventType;
  metadata: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'analytics_queue';
const BATCH_SIZE = 10;

// ponytail: __ANALYTICS_API_BASE__ replaced by vite define; falls back to empty string in jest
declare const __ANALYTICS_API_BASE__: string | undefined;
const API_BASE: string = typeof __ANALYTICS_API_BASE__ !== 'undefined' ? __ANALYTICS_API_BASE__ : '';

export function readQueue(): AnalyticsEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as AnalyticsEvent[];
  } catch {
    return [];
  }
}

export function writeQueue(events: AnalyticsEvent[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
}

async function sendBatch(events: AnalyticsEvent[]): Promise<void> {
  await axios.post(`${API_BASE}/analytics/event`, { events });
}

export async function flushEvents(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const batch = queue.slice(0, BATCH_SIZE);
  try {
    await sendBatch(batch);
    writeQueue(queue.slice(batch.length));
  } catch {
    // ponytail: leave queue intact on failure; next flush retries
  }
}

export function useAnalytics() {
  function logEvent(type: EventType, metadata: Record<string, unknown> = {}): void {
    const queue = readQueue();
    queue.push({ type, metadata, timestamp: Date.now() });
    writeQueue(queue);

    if (queue.length >= BATCH_SIZE) {
      void flushEvents();
    }
  }

  return { logEvent, flushEvents };
}
