import * as functions from 'firebase-functions';
import { db } from '../config/firebase';
import { calculateVetRating } from '../services/review';

// Triggers on new review creation, recalculates vet rating automatically
export const aggregateVetRating = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async snapshot => {
    const review = snapshot.data();

    // Only aggregate for vet reviews
    if (review.type !== 'vet') return;

    const vetId = review.targetId;

    try {
      const summary = await calculateVetRating(vetId);

      // Update vet document with new rating stats
      await db.collection('vets').doc(vetId).update({
        rating: summary.rating,
        review_count: summary.review_count,
        updated_at: new Date().toISOString(),
      });

      console.log(`✓ Updated vet ${vetId}: rating=${summary.rating}, count=${summary.review_count}`);
    } catch (error) {
      console.error(`✗ Failed to aggregate rating for vet ${vetId}:`, error);
      throw error;
    }
  });
