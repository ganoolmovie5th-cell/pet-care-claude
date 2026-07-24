import request from 'supertest';
import app from '../../index';

describe('Playdate Routes', () => {
  let postId: string;
  let chatId: string;
  const authToken = 'Bearer test-token'; // Mock token for testing

  describe('POST /playdate/posts', () => {
    it('should create a playdate post', async () => {
      const response = await request(app)
        .post('/playdate/posts')
        .set('Authorization', authToken)
        .send({
          petId: 'pet-test-123',
          petName: 'Max',
          breed: 'Labrador',
          location: {
            lat: -6.2088,
            lng: 106.8456,
            address: 'Senayan, Jakarta',
          },
          date: '2026-08-01',
          description: 'Looking for playmates',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();
      postId = response.body.id;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/playdate/posts')
        .send({
          petId: 'pet-test-123',
          breed: 'Labrador',
          location: { lat: 0, lng: 0 },
          date: '2026-08-01',
          description: 'Test',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /playdate/posts/:postId', () => {
    it('should fetch a playdate post', async () => {
      const response = await request(app)
        .get(`/playdate/posts/${postId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(postId);
      expect(response.body.petName).toBe('Max');
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/playdate/posts/non-existent-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /playdate/posts/:postId', () => {
    it('should update a playdate post', async () => {
      const response = await request(app)
        .patch(`/playdate/posts/${postId}`)
        .set('Authorization', authToken)
        .send({
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .patch('/playdate/posts/non-existent-id')
        .set('Authorization', authToken)
        .send({
          description: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /playdate/posts/owner/mine', () => {
    it('should fetch user posts', async () => {
      const response = await request(app)
        .get('/playdate/posts/owner/mine')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /playdate/posts/active/all', () => {
    it('should fetch all active posts', async () => {
      const response = await request(app)
        .get('/playdate/posts/active/all')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /playdate/posts/:postId/interested', () => {
    it('should add user as interested owner', async () => {
      const response = await request(app)
        .post(`/playdate/posts/${postId}/interested`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /playdate/posts/:postId/interested', () => {
    it('should remove user from interested owners', async () => {
      const response = await request(app)
        .delete(`/playdate/posts/${postId}/interested`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /playdate/posts/:postId/chat/start', () => {
    it('should create a playdate chat', async () => {
      const response = await request(app)
        .post(`/playdate/posts/${postId}/chat/start`)
        .set('Authorization', authToken)
        .send({
          interestedOwnerId: 'interested-user-456',
          initialMessage: 'Hi, interested in meeting!',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();
      chatId = response.body.id;
    });
  });

  describe('GET /playdate/posts/:postId/chat', () => {
    it('should fetch chats for a post', async () => {
      const response = await request(app)
        .get(`/playdate/posts/${postId}/chat`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /playdate/chat/:chatId', () => {
    it('should fetch a single chat', async () => {
      const response = await request(app)
        .get(`/playdate/chat/${chatId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(chatId);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent chat', async () => {
      const response = await request(app)
        .get('/playdate/chat/non-existent-chat-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /playdate/chat/:chatId/message', () => {
    it('should add message to chat', async () => {
      const response = await request(app)
        .post(`/playdate/chat/${chatId}/message`)
        .set('Authorization', authToken)
        .send({
          text: 'Sounds great! When are you free?',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for missing text', async () => {
      const response = await request(app)
        .post(`/playdate/chat/${chatId}/message`)
        .set('Authorization', authToken)
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Authorization & Ownership', () => {
    it('should prevent updating another user post', async () => {
      const otherUserToken = 'Bearer other-user-token';
      const response = await request(app)
        .patch(`/playdate/posts/${postId}`)
        .set('Authorization', otherUserToken)
        .send({
          description: 'Hacked!',
        });

      // Should be 404 or 403 (ownership check at service layer returns 404)
      expect([404, 403]).toContain(response.status);
    });
  });
});
