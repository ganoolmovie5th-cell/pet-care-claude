import { db } from '../config/firebase';

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: 'booking_created' | 'payment_completed' | 'playdate_posted' | 'insurance_clicked' | 'screen_view' | 'error_occurred';
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyticsEventInput {
  eventType: string;
  userId?: string;
  vetId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAnalyticsEvent(event: AnalyticsEventInput): Promise<string> {
  const now = new Date();
  const docRef = await db.collection('analytics_events').add({
    ...event,
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
  });
  return docRef.id;
}

export async function getEventStats(
  eventType: string,
  startDate: string,
  endDate: string
): Promise<{ count: number; uniqueUsers: number }> {
  const snapshot = await db
    .collection('analytics_events')
    .where('eventType', '==', eventType)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();

  const users = new Set<string>();
  snapshot.forEach(doc => {
    const uid = doc.data().userId;
    if (uid) users.add(uid);
  });

  return { count: snapshot.size, uniqueUsers: users.size };
}

export async function logEvent(
  userId: string,
  eventType: AnalyticsEvent['eventType'],
  metadata?: Record<string, unknown>
): Promise<string> {
  const docRef = await db.collection('analytics_events').add({
    userId,
    eventType,
    metadata,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
}

export async function getDailyMetrics(date: string): Promise<{
  bookingsCreated: number;
  paymentsCompleted: number;
  totalRevenue: number;
  uniqueUsers: number;
}> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await db
    .collection('analytics_events')
    .where('timestamp', '>=', startOfDay.toISOString())
    .where('timestamp', '<=', endOfDay.toISOString())
    .get();

  let bookingsCreated = 0;
  let paymentsCompleted = 0;
  const uniqueUsers = new Set<string>();
  let totalRevenue = 0;

  snapshot.forEach(doc => {
    const event = doc.data() as AnalyticsEvent;
    uniqueUsers.add(event.userId);

    if (event.eventType === 'booking_created') {
      bookingsCreated++;
    } else if (event.eventType === 'payment_completed') {
      paymentsCompleted++;
      totalRevenue += Number(event.metadata?.amount) || 0;
    }
  });

  return {
    bookingsCreated,
    paymentsCompleted,
    totalRevenue,
    uniqueUsers: uniqueUsers.size,
  };
}

export interface DailyMetrics {
  date: string;
  bookingsCreated: number;
  paymentsCompleted: number;
  totalRevenue: number;
  uniqueUsers: number;
}

export async function getMetricsRange(startDate: string, endDate: string): Promise<DailyMetrics[]> {
  const metrics: DailyMetrics[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dailyMetrics = await getDailyMetrics(dateStr);
    metrics.push({
      date: dateStr,
      ...dailyMetrics,
    });
    current.setDate(current.getDate() + 1);
  }

  return metrics;
}
