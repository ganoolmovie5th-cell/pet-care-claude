import { createVet, getAllVets, getVetById, searchVets } from '../../services/vet';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const vetInput = (over: Record<string, unknown> = {}) => ({
  clinic_name: 'Klinik Sehat',
  location: { lat: -6.2088, lng: 106.8456, city: 'Jakarta', address: 'Senayan' },
  specialties: ['general'],
  hours: { open: '09:00', close: '17:00' },
  rating: 4,
  review_count: 10,
  consultation_fee: 150000,
  phone: '+6281100000000',
  status: 'approved' as const,
  ...over,
});

describe('Vet Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('createVet', () => {
    it('forces a pending status and empty subscription regardless of input', async () => {
      const vet = await createVet(vetInput({ status: 'approved' }));

      expect(vet.id).toBeDefined();
      expect(vet.status).toBe('pending');
      expect(vet.subscription_id).toBeNull();
      expect(vet.subscription_status).toBe('pending');
      expect(Date.parse(vet.created_at)).not.toBeNaN();
    });

    it('persists the vet so it can be read back', async () => {
      const vet = await createVet(vetInput());

      await expect(getVetById(vet.id)).resolves.toMatchObject({
        id: vet.id,
        clinic_name: 'Klinik Sehat',
      });
    });
  });

  describe('getVetById', () => {
    it('returns null for an unknown id', async () => {
      await expect(getVetById('missing')).resolves.toBeNull();
    });
  });

  describe('getAllVets', () => {
    it('returns every vet regardless of status', async () => {
      fake.seed('vets', {
        'v-1': vetInput(),
        'v-2': vetInput({ status: 'blocked' }),
      });

      const vets = await getAllVets();
      expect(vets.map(v => v.id).sort()).toEqual(['v-1', 'v-2']);
    });

    it('returns an empty array when there are no vets', async () => {
      await expect(getAllVets()).resolves.toEqual([]);
    });
  });

  describe('searchVets', () => {
    beforeEach(() => {
      fake.seed('vets', {
        'jkt-surgery': vetInput({ specialties: ['surgery'], rating: 4.8 }),
        'jkt-general': vetInput({ specialties: ['general'], rating: 3.2 }),
        'bdg-general': vetInput({
          rating: 5,
          location: { lat: -6.9175, lng: 107.6191, city: 'Bandung', address: 'Dago' },
        }),
      });
    });

    it('returns everything sorted by rating descending with no filters', async () => {
      const vets = await searchVets({});
      expect(vets.map(v => v.id)).toEqual(['bdg-general', 'jkt-surgery', 'jkt-general']);
    });

    it('filters by nested city', async () => {
      const vets = await searchVets({ city: 'Bandung' });
      expect(vets.map(v => v.id)).toEqual(['bdg-general']);
    });

    it('filters by specialty via array-contains', async () => {
      const vets = await searchVets({ specialty: 'surgery' });
      expect(vets.map(v => v.id)).toEqual(['jkt-surgery']);
    });

    it('filters by minimum rating', async () => {
      const vets = await searchVets({ minRating: 4 });
      expect(vets.map(v => v.id)).toEqual(['bdg-general', 'jkt-surgery']);
    });

    it('filters by distance when lat, lng and maxDistance are all given', async () => {
      const vets = await searchVets({ lat: -6.2088, lng: 106.8456, maxDistance: 10 });
      expect(vets.map(v => v.id).sort()).toEqual(['jkt-general', 'jkt-surgery']);
    });

    it('ignores maxDistance when coordinates are missing', async () => {
      const vets = await searchVets({ maxDistance: 1 });
      expect(vets).toHaveLength(3);
    });

    it('combines filters', async () => {
      const vets = await searchVets({ city: 'Jakarta', minRating: 4 });
      expect(vets.map(v => v.id)).toEqual(['jkt-surgery']);
    });
  });
});
