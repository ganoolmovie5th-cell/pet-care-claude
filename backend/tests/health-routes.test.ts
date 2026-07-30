import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/health', () => ({
  createPet: jest.fn(),
  getPetsByOwnerId: jest.fn(),
  addHealthRecord: jest.fn(),
  getHealthRecordsByPetId: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as healthService from '../src/services/health';

const record = {
  petId: 'pet-1',
  type: 'vaksin',
  date: '2026-07-30',
  note: 'Vaksin rabies',
};

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (healthService.createPet as jest.Mock).mockResolvedValue('pet-1');
  (healthService.addHealthRecord as jest.Mock).mockResolvedValue('rec-1');
  (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([{ id: 'pet-1', name: 'Miko' }]);
  (healthService.getHealthRecordsByPetId as jest.Mock).mockResolvedValue([{ id: 'rec-1' }]);
});

describe('POST /health/pets', () => {
  it('creates the pet under the caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/health/pets')
      .set('Authorization', 'Bearer owner-token')
      .send({ name: 'Miko', breed: 'Kucing Persia', age: 3 });

    expect(res.status).toBe(201);
    expect(healthService.createPet).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      name: 'Miko',
      breed: 'Kucing Persia',
      age: 3,
      photo: undefined,
      microchip: undefined,
    });
  });

  it('accepts age zero for a newborn', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/health/pets')
      .set('Authorization', 'Bearer owner-token')
      .send({ name: 'Miko', breed: 'Kucing Persia', age: 0 });

    expect(res.status).toBe(201);
  });

  it('rejects a pet without a breed with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/health/pets')
      .set('Authorization', 'Bearer owner-token')
      .send({ name: 'Miko', age: 3 });

    expect(res.status).toBe(400);
    expect(healthService.createPet).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/health/pets').send({ name: 'Miko', breed: 'X', age: 3 });

    expect(res.status).toBe(401);
    expect(healthService.createPet).not.toHaveBeenCalled();
  });
});

describe('GET /health/pets/owner/:ownerId', () => {
  it('returns the pets of the caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .get('/health/pets/owner/owner-1')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(healthService.getPetsByOwnerId).toHaveBeenCalledWith('owner-1');
  });

  it('rejects reading another owner pets with 403', async () => {
    asUser('intruder-9');

    const res = await request(app)
      .get('/health/pets/owner/owner-1')
      .set('Authorization', 'Bearer intruder-token');

    expect(res.status).toBe(403);
    expect(healthService.getPetsByOwnerId).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/health/pets/owner/owner-1');

    expect(res.status).toBe(401);
  });
});

describe('POST /health/records', () => {
  it('adds a record for a pet the caller owns', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/health/records')
      .set('Authorization', 'Bearer owner-token')
      .send({ ...record, vet_name: 'drh. Test', next_due_date: '2027-07-30' });

    expect(res.status).toBe(201);
    expect(healthService.addHealthRecord).toHaveBeenCalledWith({
      ...record,
      vet_name: 'drh. Test',
      next_due_date: '2027-07-30',
    });
  });

  it('rejects adding a record to a pet the caller does not own with 403', async () => {
    asUser('intruder-9');
    (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/health/records')
      .set('Authorization', 'Bearer intruder-token')
      .send(record);

    expect(res.status).toBe(403);
    expect(healthService.addHealthRecord).not.toHaveBeenCalled();
  });

  it('rejects a record without a note with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/health/records')
      .set('Authorization', 'Bearer owner-token')
      .send({ petId: 'pet-1', type: 'vaksin', date: '2026-07-30' });

    expect(res.status).toBe(400);
    expect(healthService.addHealthRecord).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/health/records').send(record);

    expect(res.status).toBe(401);
    expect(healthService.addHealthRecord).not.toHaveBeenCalled();
  });
});

describe('GET /health/records/pet/:petId', () => {
  it('returns the records of an owned pet', async () => {
    asUser('owner-1');

    const res = await request(app)
      .get('/health/records/pet/pet-1')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(healthService.getHealthRecordsByPetId).toHaveBeenCalledWith('pet-1');
  });

  it('rejects reading records of a pet the caller does not own with 403', async () => {
    asUser('intruder-9');
    (healthService.getPetsByOwnerId as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/health/records/pet/pet-1')
      .set('Authorization', 'Bearer intruder-token');

    expect(res.status).toBe(403);
    expect(healthService.getHealthRecordsByPetId).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/health/records/pet/pet-1');

    expect(res.status).toBe(401);
    expect(healthService.getHealthRecordsByPetId).not.toHaveBeenCalled();
  });
});
