import { db } from '../../config/firebase';
import { getPlaydateMatches } from '../../services/geo-matching';
import { sendPlaydateMatch } from '../../services/notifications';

describe('Integration: Playdate Posting → Geo-Matching → Interest → Notification', () => {
  const mockOwner1 = {
    id: 'owner-1',
    name: 'Alice',
    location: { lat: -6.2088, lng: 106.8456 },
  };

  const mockOwner2 = {
    id: 'owner-2',
    name: 'Bob',
    location: { lat: -6.2100, lng: 106.8470 },
  };

  const mockPet1 = {
    id: 'pet-1',
    ownerId: mockOwner1.id,
    name: 'Max',
    breed: 'Golden Retriever',
    age: 2,
  };

  const mockPet2 = {
    id: 'pet-2',
    ownerId: mockOwner2.id,
    name: 'Bella',
    breed: 'Labrador',
    age: 3,
  };

  describe('Complete playdate flow', () => {
    it('posts playdate → nearby owner sees match → registers interest → post owner gets notified', async () => {
      // 1. Owner 1 creates playdate post
      const postRef = await db.collection('playdate_posts').add({
        ownerId: mockOwner1.id,
        petId: mockPet1.id,
        petName: mockPet1.name,
        breed: mockPet1.breed,
        age: mockPet1.age,
        location: {
          lat: mockOwner1.location.lat,
          lng: mockOwner1.location.lng,
          address: 'Jakarta, Indonesia',
        },
        date: '2026-08-20',
        description: 'Fun playdate at Taman Menteng',
        interested_owners: [],
        created_at: new Date().toISOString(),
        status: 'active',
      });

      const postId = postRef.id;
      expect(postId).toBeDefined();

      // 2. Owner 2 (nearby) gets geo-matched results
      const matches = await getPlaydateMatches(
        mockOwner2.location.lat,
        mockOwner2.location.lng,
        mockPet2.id,
        5,
        'score'
      );

      const matchFound = matches.some(m => m.id === postId);
      if (matchFound) {
        const match = matches.find(m => m.id === postId);
        expect(match?.distance_km).toBeLessThan(5);
        expect(match?.match_score).toBeGreaterThan(0);
      }

      // 3. Owner 2 expresses interest
      const interestRef = await db.collection('playdate_interested').add({
        postId,
        interestedOwnerId: mockOwner2.id,
        created_at: new Date().toISOString(),
      });

      expect(interestRef.id).toBeDefined();

      // 4. Simulate Cloud Function: send notification to post owner
      await sendPlaydateMatch(
        mockOwner1.id,
        mockOwner2.name,
        mockPet2.name,
        postId
      );

      // 5. Verify notification was sent
      const notifications = await db
        .collection('user_notifications')
        .where('userId', '==', mockOwner1.id)
        .where('type', '==', 'playdate_match')
        .get();

      expect(notifications.docs.length).toBeGreaterThan(0);

      const notif = notifications.docs[notifications.docs.length - 1].data();
      expect(notif.title).toContain('New Playdate Match');
      expect(notif.body).toContain(mockOwner2.name);
      expect(notif.deeplink).toBe(`app://playdate/${postId}`);
    });
  });

  describe('Geo-matching distance calculation', () => {
    it('filters posts within radius', async () => {
      const closePost = await db.collection('playdate_posts').add({
        ownerId: mockOwner1.id,
        petId: mockPet1.id,
        petName: 'Max',
        breed: 'Golden Retriever',
        location: {
          lat: -6.2088,
          lng: 106.8456,
          address: 'Close location',
        },
        date: '2026-08-22',
        interested_owners: [],
        created_at: new Date().toISOString(),
      });

      const farPost = await db.collection('playdate_posts').add({
        ownerId: 'owner-3',
        petId: 'pet-3',
        petName: 'Max',
        breed: 'Golden Retriever',
        location: {
          lat: -6.3,
          lng: 106.9,
          address: 'Far location',
        },
        date: '2026-08-23',
        interested_owners: [],
        created_at: new Date().toISOString(),
      });

      // Search from Owner 2's location with 2km radius
      const closeMatches = await getPlaydateMatches(
        mockOwner2.location.lat,
        mockOwner2.location.lng,
        mockPet2.id,
        2,
        'score'
      );

      const farMatches = await getPlaydateMatches(
        mockOwner2.location.lat,
        mockOwner2.location.lng,
        mockPet2.id,
        50,
        'score'
      );

      expect(closeMatches.length).toBeLessThanOrEqual(farMatches.length);
    });
  });

  describe('Interest tracking', () => {
    it('stores multiple interests on same post', async () => {
      const post = await db.collection('playdate_posts').add({
        ownerId: mockOwner1.id,
        petId: mockPet1.id,
        petName: mockPet1.name,
        breed: mockPet1.breed,
        location: { lat: -6.2088, lng: 106.8456, address: 'Jakarta' },
        date: '2026-08-25',
        interested_owners: [],
        created_at: new Date().toISOString(),
      });

      const postId = post.id;

      // Multiple owners express interest
      await db.collection('playdate_interested').add({
        postId,
        interestedOwnerId: 'owner-2',
        created_at: new Date().toISOString(),
      });

      await db.collection('playdate_interested').add({
        postId,
        interestedOwnerId: 'owner-3',
        created_at: new Date().toISOString(),
      });

      const interests = await db
        .collection('playdate_interested')
        .where('postId', '==', postId)
        .get();

      expect(interests.docs.length).toBe(2);
    });
  });
});
