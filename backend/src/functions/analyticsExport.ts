import { db } from '../config/firebase';
import { initBigQuery, formatEventsForBigQuery, insertRows } from '../services/bigquery';

// ponytail: exports yesterday's events only; backfill by setting TARGET_DATE env var
export async function exportAnalyticsToBigQuery(): Promise<{ exported: number }> {
  await initBigQuery();

  const targetDate =
    process.env.TARGET_DATE ?? new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const snapshot = await db
    .collection('analytics_events')
    .where('date', '==', targetDate)
    .get();

  if (snapshot.empty) return { exported: 0 };

  const rows = formatEventsForBigQuery(snapshot.docs);
  await insertRows(rows);
  return { exported: rows.length };
}
