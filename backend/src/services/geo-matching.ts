import { db } from '../config/firebase';
import { PlaydatePost } from '../types/playdate';

const EARTH_RADIUS_KM = 6371;

export interface PlaydateMatch {
  postId: string;
  ownerId: string;
  petName?: string;
  breed?: string;
  age?: number;
  photo?: string;
  distance_km: number;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  date: string;
  description: string;
  match_score: number;
}

export const calculateDistance = (
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

const calculateMatchScore = (
  distance_km: number,
  radiusKm: number,
  sameBreed: boolean,
  similarBreed: boolean,
  ageDiff: number,
  isPremium: boolean
): number => {
  let score = 0;

  // Distance is worth 65 and the bonuses below are worth 35, so a perfect match
  // lands on exactly 100. Starting from 100 here made every nearby post hit the
  // cap and hid the breed, age and premium bonuses entirely.
  const distancePenalty = (distance_km / radiusKm) * 65;
  score += Math.max(0, 65 - distancePenalty);

  // Breed bonus
  if (sameBreed) {
    score += 20;
  } else if (similarBreed) {
    score += 10;
  }

  // Age bonus
  if (ageDiff <= 2) {
    score += 10;
  } else if (ageDiff <= 5) {
    score += 5;
  }

  // Subscription bonus
  if (isPremium) {
    score += 5;
  }

  return Math.min(100, score);
};

const breedsGroup: Record<string, string[]> = {
  dog: ['labrador', 'golden retriever', 'german shepherd', 'poodle', 'bulldog', 'husky', 'pug', 'dachshund', 'beagle', 'shiba inu'],
  cat: ['siamese', 'persian', 'bengal', 'ragdoll', 'maine coon', 'british shorthair'],
};

const isSimilarBreed = (breed1?: string, breed2?: string): boolean => {
  if (!breed1 || !breed2) return false;
  const b1 = breed1.toLowerCase();
  const b2 = breed2.toLowerCase();

  // Both are dogs or both are cats
  for (const [, breeds] of Object.entries(breedsGroup)) {
    if (breeds.includes(b1) && breeds.includes(b2)) {
      return true;
    }
  }
  return false;
};

export const getPlaydateMatches = async (
  lat: number,
  lng: number,
  petId: string,
  radiusKm: number = 5,
  sort: 'score' | 'recent' = 'score'
): Promise<PlaydateMatch[]> => {
  // Get current user's pet to extract breed/age
  const petDoc = await db.collection('pets').doc(petId).get();
  if (!petDoc.exists) {
    throw new Error('Pet not found');
  }
  const petData = petDoc.data();
  const petBreed = petData?.breed;
  const petAge = petData?.age;

  // Get all active playdate posts
  const postsSnapshot = await db
    .collection('playdate_posts')
    .where('status', '==', 'active')
    .get();

  const matches: PlaydateMatch[] = [];

  for (const postDoc of postsSnapshot.docs) {
    const post = postDoc.data() as PlaydatePost;
    const postData = { ...post, id: postDoc.id };

    // Calculate distance
    const distance_km = calculateDistance(
      lat,
      lng,
      post.location.lat,
      post.location.lng
    );

    // Filter by radius
    if (distance_km > radiusKm) {
      continue;
    }

    // Get owner subscription status
    const ownerDoc = await db.collection('users').doc(post.ownerId).get();
    const ownerData = ownerDoc.data();
    const isPremium = ownerData?.subscription_status === 'active';

    // Calculate match score
    const sameBreed = post.breed?.toLowerCase() === petBreed?.toLowerCase();
    const similarBreed = isSimilarBreed(post.breed, petBreed);
    const ageDiff = petAge && post.age ? Math.abs(petAge - post.age) : 0;

    const match_score = calculateMatchScore(
      distance_km,
      radiusKm,
      sameBreed,
      similarBreed,
      ageDiff,
      isPremium
    );

    matches.push({
      postId: postData.id,
      ownerId: post.ownerId,
      petName: post.petName,
      breed: post.breed,
      age: post.age,
      photo: post.photo,
      distance_km: Math.round(distance_km * 100) / 100,
      location: post.location,
      date: post.date,
      description: post.description,
      match_score: Math.round(match_score),
    });
  }

  // Sort results
  if (sort === 'score') {
    matches.sort((a, b) => b.match_score - a.match_score);
  } else if (sort === 'recent') {
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return matches;
};
