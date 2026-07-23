import request from 'supertest';
import * as paymentService from '../../src/services/payment';
import * as vetService from '../../src/services/vet';

jest.mock('../../src/services/payment');
jest.mock('../../src/services/vet');
jest.mock('../../src/config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
  auth: {
    verifyIdToken: jest.fn(),
  },
  realtimeDb: {},
  storage: {},
}));

// Import app after mocking
import app from '../../src/index';
import { db, auth } from '../../src/config/firebase';

describe('Admin Routes', () => {
  const mockVetId = 'vet-123';
  const mockVet = {
    id: mockVetId,
    clinic_name: 'Test Clinic',
    location: { lat: -6.2, lng: 106.8, city: 'Jakarta', address: 'Jl. Test' },
    specialties: ['general'],
    hours: { open: '08:00', close: '17:00' },
    rating: 4.5,
    review_count: 10,
    consultation_fee: 100000,
    phone: '0812345678',
    created_at: new Date().toISOString(),
  };

  const mockInvoice = {
    id: 'sub-123',
    externalId: `vet-${mockVetId}`,
    amount: 350000,
    payerEmail: 'Test Clinic',
    description: 'Monthly subscription for Test Clinic',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE' as const,
  };

  const mockAdminToken = 'admin-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/vet/:vetId/approve', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).post('/admin/vet/vet-123/approve').send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should create subscription and return subscription_id and nextBillingDate', async () => {
      const mockDecodedToken = {
        uid: 'admin-user',
        customClaims: { admin: true },
      };

      (auth.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
      (vetService.getVetById as jest.Mock).mockResolvedValue(mockVet);
      (paymentService.createRecurringInvoice as jest.Mock).mockResolvedValue(mockInvoice);
      (db.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const response = await request(app)
        .post(`/admin/vet/${mockVetId}/approve`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('subscription_id', 'sub-123');
      expect(response.body).toHaveProperty('nextBillingDate');
    });

    it('should return 404 if vet not found', async () => {
      const mockDecodedToken = {
        uid: 'admin-user',
        customClaims: { admin: true },
      };

      (auth.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
      (vetService.getVetById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/admin/vet/${mockVetId}/approve`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Vet not found');
    });
  });

  describe('POST /admin/vet/:vetId/block', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app).post('/admin/vet/vet-123/block').send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should block vet and return success', async () => {
      const mockDecodedToken = {
        uid: 'admin-user',
        customClaims: { admin: true },
      };

      (auth.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
      (vetService.getVetById as jest.Mock).mockResolvedValue(mockVet);
      (db.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const response = await request(app)
        .post(`/admin/vet/${mockVetId}/block`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if vet not found', async () => {
      const mockDecodedToken = {
        uid: 'admin-user',
        customClaims: { admin: true },
      };

      (auth.verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
      (vetService.getVetById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/admin/vet/${mockVetId}/block`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Vet not found');
    });
  });
});
