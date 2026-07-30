const mockGetDatasets = jest.fn();
const mockCreateDataset = jest.fn();
const mockGetTables = jest.fn();
const mockCreateTable = jest.fn();
const mockInsert = jest.fn();

jest.mock('@google-cloud/bigquery', () => ({
  BigQuery: jest.fn(() => ({
    getDatasets: mockGetDatasets,
    createDataset: mockCreateDataset,
    dataset: () => ({
      getTables: mockGetTables,
      createTable: mockCreateTable,
      table: () => ({ insert: mockInsert }),
    }),
  })),
}));

import { formatEventsForBigQuery, initBigQuery, insertRows } from '../src/services/bigquery';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDatasets.mockResolvedValue([[{ id: 'pet_care_analytics' }]]);
  mockGetTables.mockResolvedValue([[{ id: 'analytics_events' }]]);
});


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

  it('falls back to now when a doc has no timestamp', () => {
    const rows = formatEventsForBigQuery([{ id: 'evt-3', data: () => ({}) }]);

    expect(rows[0].eventType).toBe('');
    expect(rows[0].date).toBe(rows[0].timestamp.split('T')[0]);
    expect(Number.isNaN(Date.parse(rows[0].timestamp))).toBe(false);
  });
});

describe('initBigQuery', () => {
  it('creates the dataset and table when they are missing', async () => {
    mockGetDatasets.mockResolvedValue([[]]);
    mockGetTables.mockResolvedValue([[]]);

    await initBigQuery();

    expect(mockCreateDataset).toHaveBeenCalledWith('pet_care_analytics', { location: 'US' });
    expect(mockCreateTable).toHaveBeenCalledWith('analytics_events', {
      schema: expect.arrayContaining([{ name: 'id', type: 'STRING', mode: 'REQUIRED' }]),
    });
  });

  it('creates nothing when the dataset and table already exist', async () => {
    await initBigQuery();

    expect(mockCreateDataset).not.toHaveBeenCalled();
    expect(mockCreateTable).not.toHaveBeenCalled();
  });
});

describe('insertRows', () => {
  it('inserts the rows into the analytics table', async () => {
    const rows = formatEventsForBigQuery([
      { id: 'evt-4', data: () => ({ eventType: 'vet_viewed', timestamp: '2026-07-23T12:00:00.000Z' }) },
    ]);

    await insertRows(rows);

    expect(mockInsert).toHaveBeenCalledWith(rows);
  });

  it('skips the insert call for an empty batch', async () => {
    await insertRows([]);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
