import { db } from '../config/firebase';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  age: number;
  photo?: string;
  microchip?: string;
  created_at: string;
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: 'vaksin' | 'checkup' | 'medication' | 'surgery';
  date: string;
  note: string;
  vet_name?: string;
  next_due_date?: string;
  created_at: string;
}

export const createPet = async (pet: Omit<Pet, 'id' | 'created_at'>): Promise<string> => {
  const docRef = await db.collection('pets').add({
    ...pet,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const getPetsByOwnerId = async (ownerId: string): Promise<Pet[]> => {
  const snapshot = await db.collection('pets').where('ownerId', '==', ownerId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
};

export const addHealthRecord = async (record: Omit<HealthRecord, 'id' | 'created_at'>): Promise<string> => {
  const docRef = await db.collection('health_records').add({
    ...record,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const getHealthRecordsByPetId = async (petId: string): Promise<HealthRecord[]> => {
  const snapshot = await db.collection('health_records').where('petId', '==', petId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord));
};
