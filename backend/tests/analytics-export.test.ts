import { formatEventsForBigQuery } from '../src/services/bigquery';

describe('formatEventsForBigQuery', () => {
  it('maps Firestore docs to BigQuery rows', () => {
    const docs = [
      {
        id: 'evt-1',
        data: () => ({
          eventType: 'booking_created',
          userId: 'user-1',
          vetId: 'vet-1',
          metadata: { bookingId: 'b-42' },
          timestamp: '2026-07-23T10:00:00.000Z',
          date: '2026-07-23',
        }),
      },
      {
        id: 'evt-2',
        data: () => ({
          eventType: 'screen_view',
          timestamp: '2026-07-23T11:00:00.000Z',
        }),
      },
    ];

    const rows = formatEventsForBigQuery(docs);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: 'evt-1',
      eventType: 'booking_created',
      userId: 'user-1',
      vetId: 'vet-1',
      metadata: { bookingId: 'b-42' },
      timestamp: '2026-07-23T10:00:00.000Z',
      date: '2026-07-23',
    });
    expect(rows[1]).toMatchObject({
      id: 'evt-2',
      eventType: 'screen_view',
      date: '2026-07-23',
    });
    expect(rows[1].userId).toBeUndefined();
    expect(rows[1].vetId).toBeUndefined();
  });
});
