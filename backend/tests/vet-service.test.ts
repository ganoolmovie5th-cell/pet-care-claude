const mockAdd = jest.fn();
const mockCollectionGet = jest.fn();
const mockDocGet = jest.fn();
const mockWhere = jest.fn();

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      add: mockAdd,
      get: mockCollectionGet,
      doc: jest.fn(() => ({ get: mockDocGet })),
      where: mockWhere,
    })),
  },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

import { createVet, getAllVets, getVetById, searchVets, Vet } from '../src/services/vet';

const location = { lat: -6.2, lng: 106.8, city: 'Jakarta', address: 'Jl. Test' };

const vetInput = {
  clinic_name: 'Klinik Test',
  location,
  specialties: ['general'],
  hours: { open: '08:00', close: '17:00' },
  rating: 4.5,
  review_count: 10,
  consultation_fee: 150000,
  phone: '+628123456789',
  status: 'approved' as const,
};

const asDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

beforeEach(() => {
  jest.clearAllMocks();
  // The query object is chainable, so every where() returns the same shape.
  mockWhere.mockImplementation(() => ({ where: mockWhere, get: mockCollectionGet }));
  mockCollectionGet.mockResolvedValue({ docs: [] });
});

describe('createVet', () => {
  it('forces a pending status and a fresh created_at', async () => {
    mockAdd.mockResolvedValue({ id: 'vet-1' });

    const vet = await createVet(vetInput);

    expect(vet.id).toBe('vet-1');
    expect(vet.status).toBe('pending');
    expect(vet.subscription_id).toBeNull();
    expect(vet.subscription_status).toBe('pending');
    expect(Number.isNaN(Date.parse(vet.created_at))).toBe(false);
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ clinic_name: 'Klinik Test', status: 'pending' }),
    );
  });
});

describe('getAllVets', () => {
  it('maps the document ids onto the data', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [asDoc('vet-1', { clinic_name: 'Klinik Test' })],
    });

    const vets = await getAllVets();

    expect(vets).toEqual([{ id: 'vet-1', clinic_name: 'Klinik Test' }]);
  });
});

describe('getVetById', () => {
  it('returns the vet when the document exists', async () => {
    mockDocGet.mockResolvedValue({ exists: true, id: 'vet-1', data: () => ({ rating: 4.5 }) });

    const vet = await getVetById('vet-1');

    expect(vet).toEqual({ id: 'vet-1', rating: 4.5 });
  });

  it('returns null for a missing document', async () => {
    mockDocGet.mockResolvedValue({ exists: false, data: () => undefined });

    expect(await getVetById('vet-404')).toBeNull();
  });
});

describe('searchVets', () => {
  const nearby = { ...location };
  const faraway = { ...location, lat: -7.8, lng: 110.4, city: 'Yogyakarta' };

  it('applies no query filter when no filter is given', async () => {
    await searchVets({});

    expect(mockWhere).not.toHaveBeenCalled();
  });

  it('translates the city, specialty and rating filters into where clauses', async () => {
    await searchVets({ city: 'Jakarta', specialty: 'surgery', minRating: 4 });

    expect(mockWhere).toHaveBeenCalledWith('location.city', '==', 'Jakarta');
    expect(mockWhere).toHaveBeenCalledWith('specialties', 'array-contains', 'surgery');
    expect(mockWhere).toHaveBeenCalledWith('rating', '>=', 4);
  });

  it('drops vets outside the distance radius', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        asDoc('vet-near', { location: nearby, rating: 4 }),
        asDoc('vet-far', { location: faraway, rating: 5 }),
      ],
    });

    const vets = await searchVets({ maxDistance: 10, lat: -6.2, lng: 106.8 });

    expect(vets.map(v => v.id)).toEqual(['vet-near']);
  });

  it('keeps every vet when no distance filter is given', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        asDoc('vet-near', { location: nearby, rating: 4 }),
        asDoc('vet-far', { location: faraway, rating: 5 }),
      ],
    });

    const vets = await searchVets({});

    expect(vets).toHaveLength(2);
  });

  it('sorts the results by rating descending', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        asDoc('vet-low', { location, rating: 3 }),
        asDoc('vet-high', { location, rating: 5 }),
        asDoc('vet-mid', { location, rating: 4 }),
      ],
    });

    const vets: Vet[] = await searchVets({});

    expect(vets.map(v => v.id)).toEqual(['vet-high', 'vet-mid', 'vet-low']);
  });
});
