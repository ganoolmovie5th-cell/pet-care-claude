import { auth } from '@/lib/firebase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function authHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export interface Booking {
  id: string;
  serviceName: string;
  ownerName: string;
  petName: string;
  date: string;
  time: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export interface VetDashboard {
  totalEarnings: number;
  monthEarnings: number;
  totalBookings: number;
  monthlyBreakdown: { month: string; amount: number }[];
}

export async function getVetBookings(vetId: string, limit = 50): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}/vet/${vetId}/bookings?limit=${limit}`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
  return res.json();
}

export async function getVetDashboard(vetId: string): Promise<VetDashboard> {
  const res = await fetch(`${BASE_URL}/vet/${vetId}/dashboard`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}
