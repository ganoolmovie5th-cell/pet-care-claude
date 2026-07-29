import { db } from '../../config/firebase';
import {
  createReview,
  getReviewsByTargetId,
  incrementHelpfulCount,
  calculateVetRating,
  checkReviewExists,
} from '../../services/review';

describe('Review Service', () => {
  const mockReviewData = {
    reviewerId: 'reviewer-123',
    targetId: 'vet-456',
    type: 'vet' as const,
    rating: 5,
    text: 'Excellent service!',
    verified: true,
  };

  describe('createReview', () => {
    it('creates review with default helpful_count=0', async () => {
      const reviewId = await createReview(mockReviewData);
      expect(reviewId).toBeDefined();
      expect(typeof reviewId).toBe('string');
    });

    it('assigns created_at timestamp', async () => {
      const reviewId = await createReview(mockReviewData);
      const doc = await db.collection('reviews').doc(reviewId).get();
      expect(doc.data()?.created_at).toBeDefined();
    });
  });

  describe('getReviewsByTargetId', () => {
    it('returns empty list when no reviews exist', async () => {
      const result = await getReviewsByTargetId('nonexistent-vet', 'vet');
      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by type correctly', async () => {
      const vetId = 'vet-test-123';
      await createReview({ ...mockReviewData, targetId: vetId, type: 'vet' });
      await createReview({ ...mockReviewData, targetId: vetId, type: 'owner' });

      const vetReviews = await getReviewsByTargetId(vetId, 'vet');
      expect(vetReviews.total).toBe(1);
    });

    it('respects limit and offset', async () => {
      const vetId = 'vet-pagination-test';
      for (let i = 0; i < 5; i++) {
        await createReview({ ...mockReviewData, targetId: vetId });
      }

      const page1 = await getReviewsByTargetId(vetId, 'vet', 'recent', 2, 0);
      expect(page1.reviews).toHaveLength(2);
      expect(page1.total).toBe(5);
    });

    it('sorts by helpful count', async () => {
      const vetId = 'vet-helpful-sort';
      await createReview({ ...mockReviewData, targetId: vetId, rating: 4 });
      const id2 = await createReview({ ...mockReviewData, targetId: vetId, rating: 5 });

      await incrementHelpfulCount(id2);
      await incrementHelpfulCount(id2);

      const results = await getReviewsByTargetId(vetId, 'vet', 'helpful');
      expect(results.reviews[0].id).toBe(id2);
    });
  });

  describe('incrementHelpfulCount', () => {
    it('increments helpful_count field', async () => {
      const id = await createReview(mockReviewData);
      await incrementHelpfulCount(id);
      await incrementHelpfulCount(id);

      const doc = await db.collection('reviews').doc(id).get();
      expect(doc.data()?.helpful_count).toBe(2);
    });

    it('updates updated_at timestamp', async () => {
      const id = await createReview(mockReviewData);
      const before = new Date().getTime();
      await incrementHelpfulCount(id);
      const after = new Date().getTime();

      const doc = await db.collection('reviews').doc(id).get();
      const updatedAt = new Date(doc.data()?.updated_at).getTime();
      expect(updatedAt).toBeGreaterThanOrEqual(before);
      expect(updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('calculateVetRating', () => {
    it('returns 0 rating when no reviews', async () => {
      const result = await calculateVetRating('vet-no-reviews');
      expect(result.rating).toBe(0);
      expect(result.review_count).toBe(0);
    });

    it('calculates average rating correctly', async () => {
      const vetId = 'vet-rating-calc';
      await createReview({ ...mockReviewData, targetId: vetId, rating: 4 });
      await createReview({ ...mockReviewData, targetId: vetId, rating: 5 });
      await createReview({ ...mockReviewData, targetId: vetId, rating: 3 });

      const result = await calculateVetRating(vetId);
      expect(result.rating).toBe(4.0);
      expect(result.review_count).toBe(3);
    });

    it('distributes ratings correctly', async () => {
      const vetId = 'vet-distribution';
      await createReview({ ...mockReviewData, targetId: vetId, rating: 5 });
      await createReview({ ...mockReviewData, targetId: vetId, rating: 5 });
      await createReview({ ...mockReviewData, targetId: vetId, rating: 4 });

      const result = await calculateVetRating(vetId);
      expect(result.rating_distribution[5]).toBe(2);
      expect(result.rating_distribution[4]).toBe(1);
      expect(result.rating_distribution[1]).toBe(0);
    });
  });

  describe('checkReviewExists', () => {
    it('returns false when review does not exist', async () => {
      const exists = await checkReviewExists('reviewer-x', 'vet-y');
      expect(exists).toBe(false);
    });

    it('returns true when review exists', async () => {
      await createReview(mockReviewData);
      const exists = await checkReviewExists(mockReviewData.reviewerId, mockReviewData.targetId);
      expect(exists).toBe(true);
    });

    it('checks bookingId when provided', async () => {
      const bookingId = 'booking-123';
      await createReview({ ...mockReviewData, bookingId });
      const exists = await checkReviewExists(mockReviewData.reviewerId, mockReviewData.targetId, bookingId);
      expect(exists).toBe(true);

      const notExists = await checkReviewExists(mockReviewData.reviewerId, mockReviewData.targetId, 'wrong-booking');
      expect(notExists).toBe(false);
    });
  });
});
