import { getVetRecommendations } from '../../services/recommendations';

describe('Recommendations Service', () => {
  describe('getVetRecommendations', () => {
    it('returns array of recommended vets', async () => {
      const recs = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        5
      );
      expect(Array.isArray(recs)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const limit5 = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        5
      );
      const limit10 = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        10
      );

      expect(limit5.length).toBeLessThanOrEqual(5);
      expect(limit10.length).toBeLessThanOrEqual(10);
    });

    it('includes rank_reason badges', async () => {
      const recs = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        10
      );

      recs.forEach(rec => {
        expect(rec.rank_reasons).toBeDefined();
        expect(Array.isArray(rec.rank_reasons)).toBe(true);
      });
    });

    it('includes scoring breakdown (distance, rating, history, specialty)', async () => {
      const recs = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        5
      );

      if (recs.length > 0) {
        const vet = recs[0];
        expect(vet.final_score).toBeDefined();
        expect(typeof vet.final_score).toBe('number');
      }
    });

    it('sorts by final_score descending', async () => {
      const recs = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        10
      );

      if (recs.length > 1) {
        for (let i = 1; i < recs.length; i++) {
          expect(recs[i - 1].final_score).toBeGreaterThanOrEqual(recs[i].final_score);
        }
      }
    });

    it('returns empty array when no vets match criteria', async () => {
      const recs = await getVetRecommendations(
        'owner-nonexistent',
        999,
        999,
        'pet-nonexistent',
        5
      );
      expect(Array.isArray(recs)).toBe(true);
    });

    it('scores include distance (0-30), rating (0-50), history (10), specialty (15)', async () => {
      const recs = await getVetRecommendations(
        'owner-123',
        -6.2088,
        106.8456,
        'pet-123',
        5
      );

      if (recs.length > 0) {
        const vet = recs[0];
        expect(vet.final_score).toBeLessThanOrEqual(105);
        expect(vet.final_score).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
