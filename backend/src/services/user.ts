import { db } from '../config/firebase';

export interface User {
  uid: string;
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  subscription_status?: string;
  flagged: boolean;
  created_at: string;
  updated_at?: string;
}

export const createOrUpdateUser = async (uid: string, data: Partial<User>): Promise<User> => {
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    // Update existing user
    await userRef.update({
      ...data,
      updated_at: new Date().toISOString(),
    });
    const updated = await userRef.get();
    return { uid, ...updated.data() } as User;
  } else {
    // Create new user
    const newUser = {
      ...data,
      flagged: false,
      created_at: new Date().toISOString(),
    };
    await userRef.set(newUser);
    return { uid, ...newUser } as User;
  }
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...doc.data() } as User;
};

export const flagUser = async (uid: string, flagged: boolean): Promise<void> => {
  await db.collection('users').doc(uid).update({ flagged });
};
