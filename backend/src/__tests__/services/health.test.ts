import {
  createPet,
  getPetsByOwnerId,
  addHealthRecord,
  getHealthRecordsByPetId,
} from '../../services/health';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

const petInput = (over: Record<string, unknown> = {}) => ({
  ownerId: 'owner-1',
  name: 'Rex',
  breed: 'Labrador',
  age: 3,
  ...over,
});

const recordInput = (over: Record<string, unknown> = {}) => ({
  petId: 'pet-1',
  type: 'vaksin' as const,
  date: '2026-07-01',
  note: 'Rabies shot',
  ...over,
});

describe('Health Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('createPet', () => {
    it('stores the pet with a created_at stamp', async () => {
      const id = await createPet(petInput({ microchip: 'chip-1', photo: 'https://x.test/a.jpg' }));

      const stored = fake.raw('pets', id) as Record<string, string>;
      expect(stored.name).toBe('Rex');
      expect(stored.microchip).toBe('chip-1');
      expect(Date.parse(stored.created_at)).not.toBeNaN();
    });
  });

  describe('getPetsByOwnerId', () => {
    it('returns only that owner pets, with ids attached', async () => {
      fake.seed('pets', {
        'pet-mine': petInput(),
        'pet-theirs': petInput({ ownerId: 'owner-2' }),
      });

      const pets = await getPetsByOwnerId('owner-1');
      expect(pets).toHaveLength(1);
      expect(pets[0]).toMatchObject({ id: 'pet-mine', name: 'Rex' });
    });

    it('returns an empty array for an owner with no pets', async () => {
      await expect(getPetsByOwnerId('owner-nobody')).resolves.toEqual([]);
    });
  });

  describe('addHealthRecord', () => {
    it('stores the record with a created_at stamp', async () => {
      const id = await addHealthRecord(
        recordInput({ vet_name: 'Drh. Sari', next_due_date: '2027-07-01' })
      );

      const stored = fake.raw('health_records', id) as Record<string, string>;
      expect(stored.type).toBe('vaksin');
      expect(stored.next_due_date).toBe('2027-07-01');
      expect(Date.parse(stored.created_at)).not.toBeNaN();
    });

    it('accepts every record type', async () => {
      const types = ['vaksin', 'checkup', 'medication', 'surgery'] as const;

      for (const type of types) {
        await addHealthRecord(recordInput({ type }));
      }

      const records = await getHealthRecordsByPetId('pet-1');
      expect(records.map(r => r.type).sort()).toEqual([
        'checkup',
        'medication',
        'surgery',
        'vaksin',
      ]);
    });
  });

  describe('getHealthRecordsByPetId', () => {
    it('returns only the records of that pet', async () => {
      fake.seed('health_records', {
        'rec-mine': recordInput(),
        'rec-other-pet': recordInput({ petId: 'pet-2' }),
      });

      const records = await getHealthRecordsByPetId('pet-1');
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ id: 'rec-mine', note: 'Rabies shot' });
    });

    it('returns an empty array for a pet with no records', async () => {
      await expect(getHealthRecordsByPetId('pet-nobody')).resolves.toEqual([]);
    });
  });
});
