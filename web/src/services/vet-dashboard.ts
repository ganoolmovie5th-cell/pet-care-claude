import api from './api';
import { demoBookings, demoEarnings, demoMode, demoReviews, demoSummary } from './demo';

export interface VetEarnings {
  totalEarnings: number;
  monthlyEarnings: number;
  bookingCount: number;
  lastUpdated: string;
}

export interface VetBooking {
  id: string;
  ownerId: string;
  service: string;
  amount: number;
  date: string;
  status: string;
}

export interface RatingSummary {
  rating: number;
  review_count: number;
  rating_distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface Review {
  id: string;
  reviewerId: string;
  targetId: string;
  type: 'vet' | 'owner';
  rating: number;
  text?: string;
  verified: boolean;
  helpful_count: number;
  created_at: string;
}

export const getVetDashboard = async (vetId: string) => {
  if (demoMode) return { earnings: demoEarnings, recentBookings: demoBookings.slice(0, 5) };
  const { data } = await api.get<{ earnings: VetEarnings; recentBookings: VetBooking[] }>(
    `/vet/${vetId}/dashboard`,
  );
  return data;
};

export const getVetBookings = async (vetId: string, limit = 50) => {
  if (demoMode) return demoBookings.slice(0, limit);
  const { data } = await api.get<{ bookings: VetBooking[] }>(`/vet/${vetId}/bookings`, {
    params: { limit },
  });
  return data.bookings;
};

export const getVetRatingSummary = async (vetId: string) => {
  if (demoMode) return demoSummary;
  const { data } = await api.get<RatingSummary>(`/reviews/vets/${vetId}/summary`);
  return data;
};

export const getVetReviews = async (vetId: string, sort = 'recent', limit = 20) => {
  if (demoMode) return { reviews: demoReviews.slice(0, limit), total: demoSummary.review_count };
  const { data } = await api.get<{ reviews: Review[]; total: number }>(`/reviews/${vetId}`, {
    params: { type: 'vet', sort, limit },
  });
  return data;
};
