import { calculateDistance, getPlaydateMatches } from '../../services/geo-matching';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const JAKARTA = { lat: -6.2088, lng: 106.8456 };

const post = (over: Record<string, unknown> = {}) => ({
  ownerId: 'owner-1',
  petName: 'Rex',
  breed: 'Labrador',
  age: 3,
  photo: 'https://example.test/rex.jpg',
  location: { lat: -6.2146, lng: 106.8556, address: 'Menteng' },
  date: '2026-08-01T10:00:00.000Z',
  description: 'Morning walk',
  status: 'active',
  ...over,
});

describe('Geo-Matching Service', () => {
  describe('calculateDistance', () => {
    it('calculates distance between two coordinates (Haversine)', () => {
      const distance = calculateDistance(-6.2088, 106.8456, -6.2146, 106.8556);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2);
    });

    it('returns 0 for same coordinates', () => {
      const distance = calculateDistance(-6.2088, 106.8456, -6.2088, 106.8456);
      expect(distance).toBe(0);
    });
  });

  describe('getPlaydateMatches', () => {
    beforeEach(() => {
      fake.reset();
      fake.seed('pets', { 'pet-123': { ownerId: 'me', name: 'Buddy', breed: 'Labrador', age: 3 } });
      fake.seed('users', {
        'owner-1': { subscription_status: 'free' },
        'owner-premium': { subscription_status: 'active' },
      });
    });

    it('throws when the pet does not exist', async () => {
      await expect(getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'nope')).rejects.toThrow(
        'Pet not found'
      );
    });

    it('returns empty array when no posts exist', async () => {
      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(matches).toEqual([]);
    });

    it('ignores posts that are not active', async () => {
      fake.seed('playdate_posts', {
        'p-done': post({ status: 'completed' }),
        'p-live': post(),
      });

      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(matches.map(m => m.postId)).toEqual(['p-live']);
    });

    it('filters by radius in kilometers', async () => {
      fake.seed('playdate_posts', {
        'p-near': post(),
        // Bandung, ~120km from Jakarta.
        'p-far': post({ location: { lat: -6.9175, lng: 107.6191 } }),
      });

      const near = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      const wide = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 200, 'score');

      expect(near.map(m => m.postId)).toEqual(['p-near']);
      expect(wide).toHaveLength(2);
    });

    it('scores same breed above an unrelated breed at equal distance', async () => {
      fake.seed('playdate_posts', {
        'p-same': post({ breed: 'Labrador' }),
        'p-other': post({ breed: 'Capybara' }),
      });

      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(matches.map(m => m.postId)).toEqual(['p-same', 'p-other']);
      expect(matches[0].match_score).toBeGreaterThan(matches[1].match_score);
    });

    it('gives a similar-breed bonus to another dog breed', async () => {
      fake.seed('playdate_posts', {
        'p-dog': post({ breed: 'Beagle' }),
        'p-other': post({ breed: 'Capybara' }),
      });

      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      const dog = matches.find(m => m.postId === 'p-dog');
      const other = matches.find(m => m.postId === 'p-other');
      expect(dog?.match_score).toBeGreaterThan(other?.match_score ?? 0);
    });

    it('still ranks a closer post above a farther identical one', async () => {
      fake.seed('playdate_posts', {
        'p-near': post(),
        'p-far': post({ location: { lat: -6.2488, lng: 106.8456 } }),
      });

      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(matches.map(m => m.postId)).toEqual(['p-near', 'p-far']);
    });

    it('sorts by recent when sort=recent', async () => {
      fake.seed('playdate_posts', {
        'p-old': post({ date: '2026-07-01T10:00:00.000Z' }),
        'p-new': post({ date: '2026-09-01T10:00:00.000Z' }),
      });

      const matches = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'recent');
      expect(matches.map(m => m.postId)).toEqual(['p-new', 'p-old']);
    });

    it('includes rounded distance_km and a 0-100 match_score', async () => {
      fake.seed('playdate_posts', { 'p-1': post() });

      const [match] = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(match.distance_km).toBeCloseTo(1.29, 1);
      expect(match.match_score).toBeGreaterThanOrEqual(0);
      expect(match.match_score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(match.match_score)).toBe(true);
      expect(match).toMatchObject({
        postId: 'p-1',
        ownerId: 'owner-1',
        petName: 'Rex',
        breed: 'Labrador',
        age: 3,
        description: 'Morning walk',
      });
    });

    it('caps the score at 100 for a premium owner at zero distance', async () => {
      fake.seed('playdate_posts', {
        'p-1': post({ ownerId: 'owner-premium', location: { lat: JAKARTA.lat, lng: JAKARTA.lng } }),
      });

      const [match] = await getPlaydateMatches(JAKARTA.lat, JAKARTA.lng, 'pet-123', 5, 'score');
      expect(match.distance_km).toBe(0);
      expect(match.match_score).toBe(100);
    });
  });
});
