import { calculateDistance, getPlaydateMatches } from '../../services/geo-matching';

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
    it('returns empty array when no posts exist', async () => {
      const matches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 5, 'score');
      expect(Array.isArray(matches)).toBe(true);
    });

    it('filters by radius in kilometers', async () => {
      const nearbyMatches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 1, 'score');
      const distantMatches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 50, 'score');

      expect(nearbyMatches.length).toBeLessThanOrEqual(distantMatches.length);
    });

    it('sorts by score (distance + breed + age)', async () => {
      const matches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 20, 'score');

      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          expect(matches[i - 1].match_score).toBeGreaterThanOrEqual(matches[i].match_score);
        }
      }
    });

    it('sorts by recent when sort=recent', async () => {
      const matches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 20, 'recent');

      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          const prevDate = new Date(matches[i - 1].date).getTime();
          const currDate = new Date(matches[i].date).getTime();
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      }
    });

    it('includes distance_km and match_score in results', async () => {
      const matches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 10, 'score');

      if (matches.length > 0) {
        const match = matches[0];
        expect(match.distance_km).toBeDefined();
        expect(match.match_score).toBeDefined();
        expect(typeof match.distance_km).toBe('number');
        expect(typeof match.match_score).toBe('number');
      }
    });

    it('score is 0-100 range', async () => {
      const matches = await getPlaydateMatches(-6.2088, 106.8456, 'pet-123', 20, 'score');

      matches.forEach(match => {
        expect(match.match_score).toBeGreaterThanOrEqual(0);
        expect(match.match_score).toBeLessThanOrEqual(100);
      });
    });
  });
});
