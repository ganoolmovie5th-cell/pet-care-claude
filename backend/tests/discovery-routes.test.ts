import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/geo-matching', () => ({
  getPlaydateMatches: jest.fn(),
}));

jest.mock('../src/services/recommendations', () => ({
  getVetRecommendations: jest.fn(),
}));

jest.mock('../src/services/health', () => ({
  getPetsByOwnerId: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as geoMatching from '../src/services/geo-matching';
import * as recommendations from '../src/services/recommendations';
import * as healthService from '../src/services/health';

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([{ id: 'pet-1', name: 'Miko' }]);
  (geoMatching.getPlaydateMatches as jest.Mock).mockResolvedValue([
    { postId: 'post-1', score: 0.8 },
  ]);
  (recommendations.getVetRecommendations as jest.Mock).mockResolvedValue([
    { vetId: 'vet-1', score: 0.9 },
  ]);
});

describe('GET /playdate/matches', () => {
  const get = (query: string, token = 'owner-token') =>
    request(app).get(`/playdate/matches${query}`).set('Authorization', `Bearer ${token}`);

  it('applies the default radius and sort', async () => {
    asUser('owner-1');

    const res = await get('?lat=-6.2&lng=106.8&petId=pet-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ matches: [{ postId: 'post-1', score: 0.8 }] });
    expect(geoMatching.getPlaydateMatches).toHaveBeenCalledWith(-6.2, 106.8, 'pet-1', 5, 'score');
  });

  it('honours the radius and sort from the query string', async () => {
    asUser('owner-1');

    await get('?lat=-6.2&lng=106.8&petId=pet-1&radiusKm=10&sort=recent');

    expect(geoMatching.getPlaydateMatches).toHaveBeenCalledWith(-6.2, 106.8, 'pet-1', 10, 'recent');
  });

  it('rejects matching for a pet the caller does not own with 403', async () => {
    asUser('intruder-9');
    (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([]);

    const res = await get('?lat=-6.2&lng=106.8&petId=pet-1', 'intruder-token');

    expect(res.status).toBe(403);
    expect(geoMatching.getPlaydateMatches).not.toHaveBeenCalled();
  });

  it('rejects a request without a petId with 400', async () => {
    asUser('owner-1');

    const res = await get('?lat=-6.2&lng=106.8');

    expect(res.status).toBe(400);
    expect(geoMatching.getPlaydateMatches).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/playdate/matches?lat=-6.2&lng=106.8&petId=pet-1');

    expect(res.status).toBe(401);
    expect(geoMatching.getPlaydateMatches).not.toHaveBeenCalled();
  });
});

describe('GET /recommendations/vets', () => {
  const get = (query: string, token = 'owner-token') =>
    request(app).get(`/recommendations/vets${query}`).set('Authorization', `Bearer ${token}`);

  it('applies the default limit', async () => {
    asUser('owner-1');

    const res = await get('?lat=-6.2&lng=106.8&petId=pet-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recommended_vets: [{ vetId: 'vet-1', score: 0.9 }] });
    expect(recommendations.getVetRecommendations).toHaveBeenCalledWith(
      'owner-1',
      -6.2,
      106.8,
      'pet-1',
      10,
    );
  });

  it('honours the limit from the query string', async () => {
    asUser('owner-1');

    await get('?lat=-6.2&lng=106.8&petId=pet-1&limit=5');

    expect(recommendations.getVetRecommendations).toHaveBeenCalledWith(
      'owner-1',
      -6.2,
      106.8,
      'pet-1',
      5,
    );
  });

  it('rejects recommending for a pet the caller does not own with 403', async () => {
    asUser('intruder-9');
    (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([]);

    const res = await get('?lat=-6.2&lng=106.8&petId=pet-1', 'intruder-token');

    expect(res.status).toBe(403);
    expect(recommendations.getVetRecommendations).not.toHaveBeenCalled();
  });

  it('rejects a request without a lat with 400', async () => {
    asUser('owner-1');

    const res = await get('?lng=106.8&petId=pet-1');

    expect(res.status).toBe(400);
    expect(recommendations.getVetRecommendations).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/recommendations/vets?lat=-6.2&lng=106.8&petId=pet-1');

    expect(res.status).toBe(401);
    expect(recommendations.getVetRecommendations).not.toHaveBeenCalled();
  });
});
