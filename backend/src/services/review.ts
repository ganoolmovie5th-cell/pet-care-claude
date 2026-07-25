import admin, { db } from '../config/firebase';

export interface Review {
  id: string;
  reviewerId: string;
  targetId: string;
  type: 'vet' | 'owner';
  bookingId?: string;
  rating: number;
  text?: string;
  verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at?: string;
}

export interface VetRatingSummary {
  vetId: string;
  rating: number;
  review_count: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const createReview = async (
  data: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'helpful_count'>
): Promise<string> => {
  const docRef = await db.collection('reviews').add({
    ...data,
    helpful_count: 0,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const getReviewById = async (reviewId: string): Promise<Review | null> => {
  const doc = await db.collection('reviews').doc(reviewId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Review;
};

export const getReviewsByTargetId = async (
  targetId: string,
  type: 'vet' | 'owner',
  sort: 'recent' | 'helpful' | 'rating' = 'recent',
  limit: number = 10,
  offset: number = 0
): Promise<{ reviews: Review[]; total: number }> => {
  let query = db.collection('reviews').where('targetId', '==', targetId).where('type', '==', type);

  const countSnapshot = await query.get();
  const total = countSnapshot.size;

  let queryForResults = query;

  if (sort === 'recent') {
    queryForResults = queryForResults.orderBy('created_at', 'desc');
  } else if (sort === 'helpful') {
    queryForResults = queryForResults.orderBy('helpful_count', 'desc').orderBy('created_at', 'desc');
  } else if (sort === 'rating') {
    queryForResults = queryForResults.orderBy('rating', 'desc').orderBy('created_at', 'desc');
  }

  const snapshot = await queryForResults.limit(limit).offset(offset).get();

  return {
    reviews: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)),
    total,
  };
};

export const incrementHelpfulCount = async (reviewId: string): Promise<void> => {
  await db.collection('reviews').doc(reviewId).update({
    helpful_count: admin.firestore.FieldValue.increment(1),
    updated_at: new Date().toISOString(),
  });
};

export const getReviewsByReviewer = async (reviewerId: string): Promise<Review[]> => {
  const snapshot = await db
    .collection('reviews')
    .where('reviewerId', '==', reviewerId)
    .orderBy('created_at', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
};

export const checkReviewExists = async (
  reviewerId: string,
  targetId: string,
  bookingId?: string
): Promise<boolean> => {
  let query = db
    .collection('reviews')
    .where('reviewerId', '==', reviewerId)
    .where('targetId', '==', targetId);

  if (bookingId) {
    query = query.where('bookingId', '==', bookingId);
  }

  const snapshot = await query.get();
  return !snapshot.empty;
};

export const calculateVetRating = async (vetId: string): Promise<VetRatingSummary> => {
  const snapshot = await db
    .collection('reviews')
    .where('targetId', '==', vetId)
    .where('type', '==', 'vet')
    .get();

  const reviews = snapshot.docs.map(doc => doc.data() as Review);
  const total = reviews.length;

  if (total === 0) {
    return {
      vetId,
      rating: 0,
      review_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sumRating = 0;

  reviews.forEach(review => {
    sumRating += review.rating;
    distribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
  });

  return {
    vetId,
    rating: Math.round((sumRating / total) * 10) / 10,
    review_count: total,
    rating_distribution: distribution,
  };
};
