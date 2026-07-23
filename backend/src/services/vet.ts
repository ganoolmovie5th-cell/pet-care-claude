import { db } from '../config/firebase';
import { Query } from 'firebase-admin/firestore';

export interface Vet {
  id: string;
  clinic_name: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    address: string;
  };
  specialties: string[];
  hours: {
    open: string;
    close: string;
  };
  rating: number;
  review_count: number;
  consultation_fee: number;
  phone: string;
  created_at: string;
}

export const getAllVets = async (): Promise<Vet[]> => {
  const snapshot = await db.collection('vets').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vet));
};

export const getVetById = async (vetId: string): Promise<Vet | null> => {
  const doc = await db.collection('vets').doc(vetId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Vet;
};

export const searchVets = async (filters: {
  city?: string;
  specialty?: string;
  minRating?: number;
  maxDistance?: number;
  lat?: number;
  lng?: number;
}): Promise<Vet[]> => {
  let query: Query = db.collection('vets') as Query;

  if (filters.city) {
    query = query.where('location.city', '==', filters.city);
  }

  if (filters.specialty) {
    query = query.where('specialties', 'array-contains', filters.specialty);
  }

  if (filters.minRating) {
    query = query.where('rating', '>=', filters.minRating);
  }

  const snapshot = await query.get();
  let vets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vet));

  if (filters.maxDistance && filters.lat && filters.lng) {
    vets = vets.filter(vet => {
      const distance = calculateDistance(
        filters.lat!,
        filters.lng!,
        vet.location.lat,
        vet.location.lng
      );
      return distance <= filters.maxDistance!;
    });
  }

  return vets.sort((a, b) => b.rating - a.rating);
};

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
