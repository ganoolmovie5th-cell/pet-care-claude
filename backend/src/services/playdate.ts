import { db } from '../config/firebase';
import * as admin from 'firebase-admin';

export interface PlaydatePost {
  id: string;
  ownerId: string;
  petId: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    address: string;
  };
  date: string;
  time: string;
  description: string;
  photos: string[];
  interested_owners: string[];
  status: 'open' | 'matched' | 'closed';
  created_at: string;
}

export interface PlaydateMatch {
  id: string;
  postId: string;
  ownerId: string;
  petId: string;
  interested_date: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_DISTANCE_KM = 10;

const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const createPost = async (
  post: Omit<PlaydatePost, 'id' | 'created_at' | 'interested_owners'>
): Promise<string> => {
  const docRef = await db.collection('playdate_posts').add({
    ...post,
    interested_owners: [],
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const getPostById = async (postId: string): Promise<PlaydatePost | null> => {
  const doc = await db.collection('playdate_posts').doc(postId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as PlaydatePost;
};

export const getPostsByCity = async (city: string): Promise<PlaydatePost[]> => {
  const snapshot = await db
    .collection('playdate_posts')
    .where('location.city', '==', city)
    .where('status', '==', 'open')
    .orderBy('created_at', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlaydatePost));
};

export const searchPostsNearby = async (filters: {
  city?: string;
  lat?: number;
  lng?: number;
  maxDistance?: number;
}): Promise<PlaydatePost[]> => {
  const { city, lat, lng, maxDistance = DEFAULT_MAX_DISTANCE_KM } = filters;

  let query = db.collection('playdate_posts').where('status', '==', 'open');

  if (city) {
    query = query.where('location.city', '==', city);
  }

  const snapshot = await query.orderBy('created_at', 'desc').get();
  const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlaydatePost));

  if (!lat || !lng) {
    return posts;
  }

  return posts.filter(
    post =>
      haversineDistance(lat, lng, post.location.lat, post.location.lng) <=
      maxDistance
  );
};

export const addInterestedOwner = async (
  postId: string,
  ownerId: string
): Promise<void> => {
  const postRef = db.collection('playdate_posts').doc(postId);
  await postRef.update({
    interested_owners: admin.firestore.FieldValue.arrayUnion(ownerId),
  });
};

export const removeInterestedOwner = async (
  postId: string,
  ownerId: string
): Promise<void> => {
  const postRef = db.collection('playdate_posts').doc(postId);
  await postRef.update({
    interested_owners: admin.firestore.FieldValue.arrayRemove(ownerId),
  });
};

export const getInterestedMatches = async (postId: string): Promise<PlaydateMatch[]> => {
  const snapshot = await db
    .collection('playdate_matches')
    .where('postId', '==', postId)
    .orderBy('created_at', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlaydateMatch));
};

export const createMatch = async (
  match: Omit<PlaydateMatch, 'id' | 'created_at'>
): Promise<string> => {
  const docRef = await db.collection('playdate_matches').add({
    ...match,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const updateMatchStatus = async (
  matchId: string,
  status: 'accepted' | 'rejected'
): Promise<void> => {
  await db.collection('playdate_matches').doc(matchId).update({ status });
};

export const getMatchById = async (matchId: string): Promise<PlaydateMatch | null> => {
  const doc = await db.collection('playdate_matches').doc(matchId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as PlaydateMatch;
};
