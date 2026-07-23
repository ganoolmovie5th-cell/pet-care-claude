import { db } from '../config/firebase';

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: 'booking_created' | 'payment_completed' | 'playdate_posted' | 'insurance_clicked' | 'screen_view' | 'error_occurred';
  metadata?: Record<string, any>;
  timestamp: string;
}

export async function logEvent(
  userId: string,
  eventType: AnalyticsEvent['eventType'],
  metadata?: Record<string, any>
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
  let uniqueUsers = new Set<string>();
  let totalRevenue = 0;

  snapshot.forEach(doc => {
    const event = doc.data() as AnalyticsEvent;
    uniqueUsers.add(event.userId);

    if (event.eventType === 'booking_created') {
      bookingsCreated++;
    } else if (event.eventType === 'payment_completed') {
      paymentsCompleted++;
      totalRevenue += event.metadata?.amount || 0;
    }
  });

  return {
    bookingsCreated,
    paymentsCompleted,
    totalRevenue,
    uniqueUsers: uniqueUsers.size,
  };
}

export async function getMetricsRange(startDate: string, endDate: string): Promise<any[]> {
  const metrics = [];
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
