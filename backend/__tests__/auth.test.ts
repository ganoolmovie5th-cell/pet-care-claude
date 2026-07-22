import request from 'supertest';
import app from '../src/index';

describe('Auth Routes', () => {
  describe('POST /auth/verify-token', () => {
    it('should return 400 if idToken is missing', async () => {
      const response = await request(app)
        .post('/auth/verify-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('idToken is required');
    });

    it('should return 401 if idToken is invalid', async () => {
      const response = await request(app)
        .post('/auth/verify-token')
        .send({ idToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});
