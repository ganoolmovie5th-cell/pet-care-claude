import express, { Router, Request, Response } from 'express';
import {
  createReview,
  getReviewsByTargetId,
  incrementHelpfulCount,
  checkReviewExists,
  calculateVetRating,
} from '../services/review';
import { getBookingById } from '../services/booking';
import { getVetById } from '../services/vet';
import { db } from '../config/firebase';

const router: Router = express.Router();

interface CreateReviewRequest {
  reviewerId: string;
  targetId: string;
  type: 'vet' | 'owner';
  bookingId?: string;
  rating: number;
  text?: string;
}

// POST /reviews — Create review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { reviewerId, targetId, type, bookingId, rating, text } = req.body as CreateReviewRequest;

    if (!reviewerId || !targetId || !type || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (text && text.length > 500) {
      return res.status(400).json({ error: 'Review text must be 500 characters or less' });
    }

    // Check if review already exists for this booking
    const existingReview = await checkReviewExists(reviewerId, targetId, bookingId);
    if (existingReview) {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }

    // Verify booking if provided
    let verified = false;
    if (bookingId && type === 'vet') {
      const booking = await getBookingById(bookingId);
      if (booking && booking.ownerId === reviewerId && booking.status === 'completed') {
        verified = true;
      }
    }

    const reviewId = await createReview({
      reviewerId,
      targetId,
      type,
      bookingId,
      rating,
      text,
      verified,
    });

    // Recalculate vet rating if reviewing vet
    if (type === 'vet') {
      const ratingSummary = await calculateVetRating(targetId);
      await db.collection('vets').doc(targetId).update({
        rating: ratingSummary.rating,
        review_count: ratingSummary.review_count,
        rating_distribution: ratingSummary.rating_distribution,
      });
    }

    return res.status(201).json({ id: reviewId, verified });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /reviews/:targetId — Get reviews for vet/owner
router.get('/:targetId', async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const { type = 'vet', sort = 'recent', limit = '10', offset = '0' } = req.query;

    if (type !== 'vet' && type !== 'owner') {
      return res.status(400).json({ error: 'Type must be vet or owner' });
    }

    const result = await getReviewsByTargetId(
      targetId,
      type as 'vet' | 'owner',
      sort as 'recent' | 'helpful' | 'rating',
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /vets/:vetId/summary — Get vet rating summary
router.get('/vets/:vetId/summary', async (req: Request, res: Response) => {
  try {
    const { vetId } = req.params;

    const vet = await getVetById(vetId);
    if (!vet) {
      return res.status(404).json({ error: 'Vet not found' });
    }

    return res.json({
      rating: vet.rating || 0,
      review_count: vet.review_count || 0,
      rating_distribution: vet.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  } catch (error) {
    console.error('Error fetching vet summary:', error);
    return res.status(500).json({ error: 'Failed to fetch vet summary' });
  }
});

// POST /reviews/:reviewId/helpful — Upvote review
router.post('/:reviewId/helpful', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    await incrementHelpfulCount(reviewId);

    return res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    console.error('Error marking review helpful:', error);
    return res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

export default router;
