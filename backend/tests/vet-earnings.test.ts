import request from 'supertest';
import * as vetService from '../src/services/vetEarnings';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));
jest.mock('../src/services/vetEarnings');

import app from '../src/index';
import { auth } from '../src/config/firebase';

const VET_ID = 'vet-abc';

const mockEarnings = {
  totalEarnings: 500000,
  monthlyEarnings: 200000,
  bookingCount: 5,
  lastUpdated: new Date().toISOString(),
};

const mockBookings = [
  { id: 'b1', ownerId: 'o1', service: 'checkup', amount: 100000, date: '2026-07-01', status: 'completed' },
];

describe('GET /vet/:vetId/dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return dashboard data with earnings', async () => {
    (auth.verifyIdToken as jest.Mock).mockResolvedValue({
      uid: VET_ID,
      customClaims: { vet: VET_ID },
    });
    (vetService.getVetEarnings as jest.Mock).mockResolvedValue(mockEarnings);
    (vetService.getVetBookings as jest.Mock).mockResolvedValue(mockBookings);

    const res = await request(app)
      .get(`/vet/${VET_ID}/dashboard`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.earnings).toMatchObject({ totalEarnings: 500000, bookingCount: 5 });
    expect(res.body.recentBookings).toHaveLength(1);
  });

  it('should reject missing authorization with 401', async () => {
    const res = await request(app).get(`/vet/${VET_ID}/dashboard`);
    expect(res.status).toBe(401);
  });

  it('should reject wrong vet claim with 403', async () => {
    (auth.verifyIdToken as jest.Mock).mockResolvedValue({
      uid: 'other-vet',
      customClaims: { vet: 'other-vet' },
    });

    const res = await request(app)
      .get(`/vet/${VET_ID}/dashboard`)
      .set('Authorization', 'Bearer other-token');

    expect(res.status).toBe(403);
  });
});
