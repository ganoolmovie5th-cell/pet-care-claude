import { createOrUpdateUser, getUserById, flagUser } from '../../services/user';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

describe('User Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('createOrUpdateUser', () => {
    it('creates a new user with flagged false and a created_at timestamp', async () => {
      const user = await createOrUpdateUser('uid-new', { name: 'Ilham', phone: '+6281100000000' });

      expect(user.uid).toBe('uid-new');
      expect(user.name).toBe('Ilham');
      expect(user.flagged).toBe(false);
      expect(Date.parse(user.created_at)).not.toBeNaN();
      expect(user.updated_at).toBeUndefined();
    });

    it('updates an existing user and stamps updated_at without touching created_at', async () => {
      const created = await createOrUpdateUser('uid-existing', { name: 'Old' });

      const updated = await createOrUpdateUser('uid-existing', { name: 'New' });

      expect(updated.name).toBe('New');
      expect(updated.created_at).toBe(created.created_at);
      expect(Date.parse(updated.updated_at as string)).not.toBeNaN();
    });

    it('merges partial updates instead of replacing the document', async () => {
      await createOrUpdateUser('uid-merge', { name: 'Ilham', phone: '+6281100000000' });

      const updated = await createOrUpdateUser('uid-merge', { email: 'ilham@example.test' });

      expect(updated.name).toBe('Ilham');
      expect(updated.phone).toBe('+6281100000000');
      expect(updated.email).toBe('ilham@example.test');
    });
  });

  describe('getUserById', () => {
    it('returns null for an unknown uid', async () => {
      await expect(getUserById('missing')).resolves.toBeNull();
    });

    it('returns the stored user', async () => {
      fake.seed('users', {
        'uid-seed': {
          name: 'Seeded',
          flagged: false,
          created_at: '2026-07-01T00:00:00.000Z',
        },
      });

      await expect(getUserById('uid-seed')).resolves.toMatchObject({
        uid: 'uid-seed',
        name: 'Seeded',
      });
    });
  });

  describe('flagUser', () => {
    it('flags and unflags a user', async () => {
      await createOrUpdateUser('uid-flag', { name: 'Suspicious' });

      await flagUser('uid-flag', true);
      expect((await getUserById('uid-flag'))?.flagged).toBe(true);

      await flagUser('uid-flag', false);
      expect((await getUserById('uid-flag'))?.flagged).toBe(false);
    });
  });
});
