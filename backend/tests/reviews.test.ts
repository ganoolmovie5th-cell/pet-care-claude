import request from 'supertest';

const mockUpdate = jest.fn();

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ update: mockUpdate })),
    })),
  },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/review', () => ({
  createReview: jest.fn(),
  getReviewsByTargetId: jest.fn(),
  incrementHelpfulCount: jest.fn(),
  checkReviewExists: jest.fn(),
  calculateVetRating: jest.fn(),
}));

jest.mock('../src/services/booking', () => ({
  getBookingById: jest.fn(),
}));

jest.mock('../src/services/vet', () => ({
  getVetById: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as reviewService from '../src/services/review';
import * as bookingService from '../src/services/booking';
import * as vetService from '../src/services/vet';

const ratingSummary = {
  rating: 4.5,
  review_count: 10,
  rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 4, 5: 5 },
};

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (reviewService.checkReviewExists as jest.Mock).mockResolvedValue(false);
  (reviewService.createReview as jest.Mock).mockResolvedValue('rev-1');
  (reviewService.calculateVetRating as jest.Mock).mockResolvedValue(ratingSummary);
});

describe('POST /reviews', () => {
  const body = { targetId: 'vet-1', type: 'vet', bookingId: 'b-1', rating: 5, text: 'Bagus' };

  const post = (payload: Record<string, unknown>) =>
    request(app).post('/reviews').set('Authorization', 'Bearer owner-token').send(payload);

  it('marks the review verified for the owner of a completed booking', async () => {
    asUser('owner-1');
    (bookingService.getBookingById as jest.Mock).mockResolvedValue({
      ownerId: 'owner-1',
      status: 'completed',
    });

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'rev-1', verified: true });
    expect(mockUpdate).toHaveBeenCalledWith(ratingSummary);
  });

  it('leaves the review unverified when the booking belongs to someone else', async () => {
    asUser('intruder-9');
    (bookingService.getBookingById as jest.Mock).mockResolvedValue({
      ownerId: 'owner-1',
      status: 'completed',
    });

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);
  });

  it('leaves the review unverified when the booking is not completed', async () => {
    asUser('owner-1');
    (bookingService.getBookingById as jest.Mock).mockResolvedValue({
      ownerId: 'owner-1',
      status: 'pending',
    });

    const res = await post(body);

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(false);
  });

  it('skips the vet rating update for an owner review', async () => {
    asUser('vet-1');

    const res = await post({ targetId: 'owner-1', type: 'owner', rating: 4 });

    expect(res.status).toBe(201);
    expect(reviewService.calculateVetRating).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects a duplicate review with 409', async () => {
    asUser('owner-1');
    (reviewService.checkReviewExists as jest.Mock).mockResolvedValue(true);

    const res = await post(body);

    expect(res.status).toBe(409);
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });

  it('rejects a missing rating with 400', async () => {
    asUser('owner-1');

    const res = await post({ targetId: 'vet-1', type: 'vet' });

    expect(res.status).toBe(400);
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });

  it('rejects a rating above 5 with 400', async () => {
    asUser('owner-1');

    const res = await post({ ...body, rating: 6 });

    expect(res.status).toBe(400);
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });

  it('rejects review text longer than 500 characters with 400', async () => {
    asUser('owner-1');

    const res = await post({ ...body, text: 'a'.repeat(501) });

    expect(res.status).toBe(400);
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/reviews').send(body);

    expect(res.status).toBe(401);
    expect(reviewService.createReview).not.toHaveBeenCalled();
  });
});

describe('GET /reviews/:targetId', () => {
  it('returns reviews with the paging arguments applied', async () => {
    (reviewService.getReviewsByTargetId as jest.Mock).mockResolvedValue({ reviews: [], total: 0 });

    const res = await request(app).get('/reviews/vet-1?sort=helpful&limit=5&offset=10');

    expect(res.status).toBe(200);
    expect(reviewService.getReviewsByTargetId).toHaveBeenCalledWith(
      'vet-1',
      'vet',
      'helpful',
      5,
      10,
    );
  });

  it('rejects an unknown target type with 400', async () => {
    const res = await request(app).get('/reviews/vet-1?type=clinic');

    expect(res.status).toBe(400);
    expect(reviewService.getReviewsByTargetId).not.toHaveBeenCalled();
  });
});

describe('GET /reviews/vets/:vetId/summary', () => {
  it('returns the stored rating summary', async () => {
    (vetService.getVetById as jest.Mock).mockResolvedValue(ratingSummary);

    const res = await request(app).get('/reviews/vets/vet-1/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(ratingSummary);
  });

  it('defaults the summary for a vet with no reviews yet', async () => {
    (vetService.getVetById as jest.Mock).mockResolvedValue({ id: 'vet-2' });

    const res = await request(app).get('/reviews/vets/vet-2/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      rating: 0,
      review_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('returns 404 for an unknown vet', async () => {
    (vetService.getVetById as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/reviews/vets/vet-404/summary');

    expect(res.status).toBe(404);
  });
});

describe('POST /reviews/:reviewId/helpful', () => {
  it('increments the helpful count for an authenticated caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/reviews/rev-1/helpful')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(reviewService.incrementHelpfulCount).toHaveBeenCalledWith('rev-1');
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/reviews/rev-1/helpful');

    expect(res.status).toBe(401);
    expect(reviewService.incrementHelpfulCount).not.toHaveBeenCalled();
  });
});
