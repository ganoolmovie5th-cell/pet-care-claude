import { getVetRecommendations } from '../../services/recommendations';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const JAKARTA = { lat: -6.2088, lng: 106.8456 };

const vet = (over: Record<string, unknown> = {}) => ({
  clinic_name: 'Klinik Sehat',
  location: { lat: -6.2146, lng: 106.8556, address: 'Menteng' },
  specialties: ['general'],
  rating: 4,
  review_count: 12,
  consultation_fee: 150000,
  status: 'approved',
  ...over,
});

const recommend = (petId = 'pet-123', limit = 10) =>
  getVetRecommendations('owner-123', JAKARTA.lat, JAKARTA.lng, petId, limit);

describe('Recommendations Service', () => {
  beforeEach(() => {
    fake.reset();
    fake.seed('pets', {
      'pet-123': { ownerId: 'owner-123', name: 'Buddy', type: 'dog', breed: 'Labrador' },
    });
  });

  describe('getVetRecommendations', () => {
    it('throws when the pet does not exist', async () => {
      await expect(recommend('pet-missing')).rejects.toThrow('Pet not found');
    });

    it('returns an empty array when no vets are approved', async () => {
      fake.seed('vets', { 'v-pending': vet({ status: 'pending' }) });
      await expect(recommend()).resolves.toEqual([]);
    });

    it('skips vets that are not approved', async () => {
      fake.seed('vets', {
        'v-ok': vet(),
        'v-blocked': vet({ status: 'blocked' }),
      });

      const recs = await recommend();
      expect(recs.map(r => r.id)).toEqual(['v-ok']);
    });

    it('respects the limit parameter', async () => {
      fake.seed('vets', { 'v-1': vet(), 'v-2': vet(), 'v-3': vet() });

      expect(await recommend('pet-123', 2)).toHaveLength(2);
      expect(await recommend('pet-123', 10)).toHaveLength(3);
    });

    it('sorts by recommendation_score descending', async () => {
      fake.seed('vets', {
        'v-low': vet({ rating: 2 }),
        'v-high': vet({ rating: 5 }),
        'v-mid': vet({ rating: 3.5 }),
      });

      const recs = await recommend();
      expect(recs.map(r => r.id)).toEqual(['v-high', 'v-mid', 'v-low']);
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].recommendation_score).toBeGreaterThanOrEqual(
          recs[i].recommendation_score
        );
      }
    });

    it('breaks score ties by distance', async () => {
      fake.seed('vets', {
        'v-far': vet({ location: { lat: -6.2588, lng: 106.8456 } }),
        'v-near': vet({ location: JAKARTA }),
      });

      const recs = await recommend();
      // Same rating and specialties, so only the distance term separates them.
      expect(recs[0].id).toBe('v-near');
      expect(recs[0].distance_km).toBe(0);
      expect(recs[1].distance_km).toBeGreaterThan(recs[0].distance_km);
    });

    it('labels a high-rated vet and awards the rating bonus', async () => {
      fake.seed('vets', { 'v-1': vet({ rating: 4.8 }) });

      const [rec] = await recommend();
      expect(rec.rank_reason).toBe('High rated');
      expect(rec.recommendation_score).toBeGreaterThan(48);
    });

    it('awards a specialty bonus when specialties mention the pet type', async () => {
      fake.seed('vets', {
        'v-dog': vet({ specialties: ['Dog surgery'] }),
        'v-general': vet({ specialties: ['general'] }),
      });

      const recs = await recommend();
      const dog = recs.find(r => r.id === 'v-dog');
      const general = recs.find(r => r.id === 'v-general');
      expect(dog?.recommendation_score).toBeGreaterThan(general?.recommendation_score ?? 0);
      expect(dog?.rank_reason).toBe('Specialization match');
    });

    it('awards a booking-history bonus for a vet the owner used before', async () => {
      fake.seed('vets', { 'v-known': vet(), 'v-new': vet() });
      fake.seed('bookings', {
        'b-1': { ownerId: 'owner-123', vetId: 'v-known', status: 'completed' },
        // Another owner's booking must not count.
        'b-2': { ownerId: 'owner-999', vetId: 'v-new', status: 'completed' },
      });

      const recs = await recommend();
      const known = recs.find(r => r.id === 'v-known');
      const fresh = recs.find(r => r.id === 'v-new');
      expect(known?.recommendation_score).toBeGreaterThan(fresh?.recommendation_score ?? 0);
      expect(known?.rank_reason).toBe('Past experience');
    });

    it('reports rounded distance and a bounded score', async () => {
      fake.seed('vets', { 'v-1': vet() });

      const [rec] = await recommend();
      expect(rec.distance_km).toBeCloseTo(1.29, 1);
      expect(rec.recommendation_score).toBeGreaterThanOrEqual(0);
      expect(rec.recommendation_score).toBeLessThanOrEqual(105);
      expect(typeof rec.rank_reason).toBe('string');
    });

    it('falls back to the Available reason for an unremarkable distant vet', async () => {
      // >10km away zeroes the distance term, rating <4.5, no history, no specialty.
      fake.seed('vets', {
        'v-1': vet({ rating: 3, location: { lat: -6.4088, lng: 106.8456 } }),
      });

      const [rec] = await recommend();
      expect(rec.rank_reason).toBe('Available');
      expect(rec.recommendation_score).toBe(30);
    });
  });
});
