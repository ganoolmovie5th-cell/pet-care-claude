import api from '../services/api';

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

// POST /analytics/event takes one event, so the batch is only a flush unit.
// Sequential on purpose: a failure must leave the rest of the queue untouched.
async function sendBatch(events: AnalyticsEvent[], onSent: () => void): Promise<void> {
  for (const event of events) {
    await api.post('/analytics/event', { eventType: event.type, metadata: event.metadata });
    onSent();
  }
}

export async function flushEvents(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const batch = queue.slice(0, BATCH_SIZE);
  let sent = 0;
  try {
    await sendBatch(batch, () => {
      sent += 1;
    });
  } catch {
    // ponytail: drop only what was accepted; next flush retries the rest
  }
  if (sent > 0) {
    writeQueue(queue.slice(sent));
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
