import { BigQuery } from '@google-cloud/bigquery';

const DATASET_ID = 'pet_care_analytics';
const TABLE_ID = 'analytics_events';

const bq = new BigQuery({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const TABLE_SCHEMA = [
  { name: 'id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'eventType', type: 'STRING', mode: 'REQUIRED' },
  { name: 'userId', type: 'STRING', mode: 'NULLABLE' },
  { name: 'vetId', type: 'STRING', mode: 'NULLABLE' },
  { name: 'metadata', type: 'JSON', mode: 'NULLABLE' },
  { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'date', type: 'DATE', mode: 'REQUIRED' },
];

export async function initBigQuery(): Promise<void> {
  const [datasets] = await bq.getDatasets();
  const exists = datasets.some(d => d.id === DATASET_ID);
  if (!exists) {
    await bq.createDataset(DATASET_ID, { location: 'US' });
  }

  const dataset = bq.dataset(DATASET_ID);
  const [tables] = await dataset.getTables();
  const tableExists = tables.some(t => t.id === TABLE_ID);
  if (!tableExists) {
    await dataset.createTable(TABLE_ID, { schema: TABLE_SCHEMA });
  }
}

export interface BigQueryAnalyticsRow {
  id: string;
  eventType: string;
  userId?: string;
  vetId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  date: string;
}

export function formatEventsForBigQuery(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): BigQueryAnalyticsRow[] {
  return docs.map(doc => {
    const d = doc.data();
    const ts = (d.timestamp as string) ?? new Date().toISOString();
    return {
      id: doc.id,
      eventType: (d.eventType as string) ?? '',
      userId: (d.userId as string) ?? undefined,
      vetId: (d.vetId as string) ?? undefined,
      metadata: (d.metadata as Record<string, unknown>) ?? undefined,
      timestamp: ts,
      date: ts.split('T')[0],
    };
  });
}

export async function insertRows(rows: BigQueryAnalyticsRow[]): Promise<void> {
  if (rows.length === 0) return;
  const table = bq.dataset(DATASET_ID).table(TABLE_ID);
  await table.insert(rows);
}
