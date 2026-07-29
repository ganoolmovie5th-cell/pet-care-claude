import { db } from '../../config/firebase';
import { createBooking, getBookingById } from '../../services/booking';
import { createReview, calculateVetRating } from '../../services/review';
import { sendBookingConfirmationBoth } from '../../services/notifications';

describe('Integration: Booking → Review → Rating Update', () => {
  const mockData = {
    ownerId: 'owner-123',
    petId: 'pet-456',
    vetId: 'vet-789',
    date: '2026-08-15',
    time: '14:00',
    notes: 'Routine checkup',
    phoneNumber: '+62812345678',
    petName: 'Fluffy',
    vetClinicName: 'Happy Vet Clinic',
  };

  describe('Complete booking flow', () => {
    it('creates booking → confirms → sends SMS+FCM → owner reviews → vet rating updated', async () => {
      // 1. Create booking
      const bookingId = await createBooking({
        ownerId: mockData.ownerId,
        petId: mockData.petId,
        vetId: mockData.vetId,
        date: mockData.date,
        time: mockData.time,
        notes: mockData.notes,
        payment_status: 'pending',
        status: 'confirmed',
      });

      expect(bookingId).toBeDefined();

      // 2. Fetch booking
      const fetched = await getBookingById(bookingId);
      expect(fetched?.status).toBe('confirmed');

      // 3. Send confirmation notifications (SMS + FCM)
      await sendBookingConfirmationBoth(
        mockData.phoneNumber,
        mockData.ownerId,
        mockData.petName,
        mockData.vetClinicName,
        mockData.date,
        bookingId
      );

      // Verify notification was saved
      const notifications = await db
        .collection('user_notifications')
        .where('userId', '==', mockData.ownerId)
        .where('type', '==', 'booking')
        .get();

      expect(notifications.docs.length).toBeGreaterThan(0);

      // 4. Owner creates review post-visit
      const reviewId = await createReview({
        reviewerId: mockData.ownerId,
        targetId: mockData.vetId,
        type: 'vet',
        bookingId: bookingId,
        rating: 5,
        text: 'Excellent vet, very professional!',
        verified: true,
      });

      expect(reviewId).toBeDefined();

      // 5. Verify review was saved
      const reviewDoc = await db.collection('reviews').doc(reviewId).get();
      expect(reviewDoc.data()?.helpful_count).toBe(0);
      expect(reviewDoc.data()?.rating).toBe(5);

      // 6. Calculate vet rating (simulating Cloud Function)
      const rating = await calculateVetRating(mockData.vetId);
      expect(rating.vetId).toBe(mockData.vetId);
      expect(rating.review_count).toBeGreaterThan(0);
      expect(rating.rating).toBeGreaterThan(0);

      // 7. Verify vet rating was persisted
      const vetDoc = await db.collection('vets').doc(mockData.vetId).get();
      if (vetDoc.exists) {
        expect(vetDoc.data()?.rating).toBeDefined();
      }
    });
  });

  describe('Multiple reviews aggregate correctly', () => {
    it('calculates average from multiple reviews', async () => {
      const vetId = 'vet-rating-test';

      // Create 3 reviews with different ratings
      await createReview({
        reviewerId: 'reviewer-1',
        targetId: vetId,
        type: 'vet',
        rating: 5,
        verified: true,
      });

      await createReview({
        reviewerId: 'reviewer-2',
        targetId: vetId,
        type: 'vet',
        rating: 4,
        verified: true,
      });

      await createReview({
        reviewerId: 'reviewer-3',
        targetId: vetId,
        type: 'vet',
        rating: 3,
        verified: true,
      });

      // Calculate aggregate
      const summary = await calculateVetRating(vetId);

      expect(summary.rating).toBe(4.0);
      expect(summary.review_count).toBe(3);
      expect(summary.rating_distribution[5]).toBe(1);
      expect(summary.rating_distribution[4]).toBe(1);
      expect(summary.rating_distribution[3]).toBe(1);
    });
  });

  describe('Notification persistence', () => {
    it('stores booking confirmation notification with deeplink', async () => {
      const bookingId = await createBooking({
        ownerId: mockData.ownerId,
        petId: mockData.petId,
        vetId: mockData.vetId,
        date: mockData.date,
        time: mockData.time,
        notes: 'Test',
        payment_status: 'paid',
        status: 'confirmed',
      });

      await sendBookingConfirmationBoth(
        mockData.phoneNumber,
        mockData.ownerId,
        mockData.petName,
        mockData.vetClinicName,
        mockData.date,
        bookingId
      );

      const notifs = await db
        .collection('user_notifications')
        .where('userId', '==', mockData.ownerId)
        .where('type', '==', 'booking')
        .get();

      const notif = notifs.docs[notifs.docs.length - 1].data();
      expect(notif.deeplink).toBe(`app://booking/${bookingId}`);
      expect(notif.sent_at).toBeDefined();
      expect(notif.read_at).toBeNull();
    });
  });
});
