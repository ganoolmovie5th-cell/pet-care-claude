import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/vet', () => ({
  createVet: jest.fn(),
  getAllVets: jest.fn(),
  getVetById: jest.fn(),
  searchVets: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as vetService from '../src/services/vet';

const vet = {
  clinic_name: 'Klinik Test',
  location: { lat: -6.2, lng: 106.8, city: 'Jakarta', address: 'Jl. Test' },
  specialties: ['general'],
  hours: { open: '08:00', close: '17:00' },
  consultation_fee: 150000,
  phone: '+628123456789',
  email: 'klinik@example.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'owner-1' });
  (vetService.createVet as jest.Mock).mockResolvedValue({ id: 'vet-1', ...vet });
  (vetService.getAllVets as jest.Mock).mockResolvedValue([{ id: 'vet-1' }]);
  (vetService.searchVets as jest.Mock).mockResolvedValue([{ id: 'vet-1' }]);
});

describe('POST /vets', () => {
  it('creates the clinic as pending with zeroed ratings', async () => {
    const res = await request(app)
      .post('/vets')
      .set('Authorization', 'Bearer owner-token')
      .send(vet);

    expect(res.status).toBe(201);
    expect(vetService.createVet).toHaveBeenCalledWith({
      ...vet,
      rating: 0,
      review_count: 0,
      status: 'pending',
    });
  });

  it('keeps a submitted rating instead of defaulting it', async () => {
    await request(app)
      .post('/vets')
      .set('Authorization', 'Bearer owner-token')
      .send({ ...vet, rating: 4.5, review_count: 12 });

    expect(vetService.createVet).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4.5, review_count: 12 }),
    );
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/vets').send(vet);

    expect(res.status).toBe(401);
    expect(vetService.createVet).not.toHaveBeenCalled();
  });
});

describe('GET /vets', () => {
  it('lists the directory without a token', async () => {
    const res = await request(app).get('/vets');

    expect(res.status).toBe(200);
    expect(vetService.getAllVets).toHaveBeenCalled();
  });
});

describe('GET /vets/search', () => {
  it('parses the numeric filters from the query string', async () => {
    const res = await request(app).get(
      '/vets/search?city=Jakarta&specialty=surgery&minRating=4&maxDistance=10&lat=-6.2&lng=106.8',
    );

    expect(res.status).toBe(200);
    expect(vetService.searchVets).toHaveBeenCalledWith({
      city: 'Jakarta',
      specialty: 'surgery',
      minRating: 4,
      maxDistance: 10,
      lat: -6.2,
      lng: 106.8,
    });
  });

  it('leaves every filter undefined when no query is given', async () => {
    await request(app).get('/vets/search');

    expect(vetService.searchVets).toHaveBeenCalledWith({
      city: undefined,
      specialty: undefined,
      minRating: undefined,
      maxDistance: undefined,
      lat: undefined,
      lng: undefined,
    });
  });
});

describe('GET /vets/:vetId', () => {
  it('returns the clinic', async () => {
    (vetService.getVetById as jest.Mock).mockResolvedValue({ id: 'vet-1', ...vet });

    const res = await request(app).get('/vets/vet-1');

    expect(res.status).toBe(200);
    expect(res.body.clinic_name).toBe('Klinik Test');
  });

  it('returns 404 for an unknown clinic', async () => {
    (vetService.getVetById as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/vets/vet-404');

    expect(res.status).toBe(404);
  });
});
