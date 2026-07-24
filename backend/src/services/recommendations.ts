import { db } from '../config/firebase';
import { Vet } from './vet';

const EARTH_RADIUS_KM = 6371;

export interface RecommendedVet extends Vet {
  distance_km: number;
  rank_reason: string;
  recommendation_score: number;
}

const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const calculateRecommendationScore = (
  distance_km: number,
  rating: number,
  hasBookingHistory: boolean,
  specialtyMatch: boolean
): { score: number; reason: string } => {
  let score = 0;
  const reasons: string[] = [];

  // Distance score (0-30 points, capped at 10km)
  const distanceScore = Math.max(0, 30 - (distance_km / 10) * 30);
  score += distanceScore;

  // Rating bonus (0-50 points)
  const ratingScore = (rating || 0) * 10;
  score += ratingScore;
  if (rating >= 4.5) {
    reasons.push('High rated');
  }

  // Booking history bonus (10 points)
  if (hasBookingHistory) {
    score += 10;
    reasons.push('Past experience');
  }

  // Specialty match bonus (15 points)
  if (specialtyMatch) {
    score += 15;
    reasons.push('Specialization match');
  }

  // Distance reason
  if (distance_km <= 2) {
    reasons.push('Nearby');
  }

  return {
    score: Math.round(score * 10) / 10,
    reason: reasons.length > 0 ? reasons[0] : 'Available',
  };
};

export const getVetRecommendations = async (
  ownerId: string,
  lat: number,
  lng: number,
  petId: string,
  limit: number = 10
): Promise<RecommendedVet[]> => {
  // Get owner's pet to extract type/breed
  const petDoc = await db.collection('pets').doc(petId).get();
  if (!petDoc.exists) {
    throw new Error('Pet not found');
  }
  const petData = petDoc.data();
  const petType = petData?.type || 'dog';
  const petBreed = petData?.breed;

  // Get owner's booking history
  const bookingsSnapshot = await db
    .collection('bookings')
    .where('ownerId', '==', ownerId)
    .get();

  const vetIdSet = new Set<string>();
  for (const doc of bookingsSnapshot.docs) {
    const booking = doc.data();
    vetIdSet.add(booking.vetId);
  }

  // Get all approved vets
  const vetsSnapshot = await db
    .collection('vets')
    .where('status', '==', 'approved')
    .get();

  const recommendations: RecommendedVet[] = [];

  for (const vetDoc of vetsSnapshot.docs) {
    const vet = { id: vetDoc.id, ...vetDoc.data() } as Vet;

    // Calculate distance
    const distance_km = calculateDistance(
      lat,
      lng,
      vet.location.lat,
      vet.location.lng
    );

    // Check booking history
    const hasBookingHistory = vetIdSet.has(vet.id);

    // Check specialty match
    const specialtyMatch =
      vet.specialties.some(s => s.toLowerCase().includes(petType.toLowerCase())) ||
      (petBreed && vet.specialties.some(s => s.toLowerCase().includes(petBreed.toLowerCase())));

    // Calculate score and reason
    const { score, reason } = calculateRecommendationScore(
      distance_km,
      vet.rating,
      hasBookingHistory,
      specialtyMatch
    );

    recommendations.push({
      ...vet,
      distance_km: Math.round(distance_km * 100) / 100,
      rank_reason: reason,
      recommendation_score: score,
    });
  }

  // Sort by recommendation score, then distance
  recommendations.sort((a, b) => {
    if (b.recommendation_score !== a.recommendation_score) {
      return b.recommendation_score - a.recommendation_score;
    }
    return a.distance_km - b.distance_km;
  });

  return recommendations.slice(0, limit);
};
