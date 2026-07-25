import type { RatingSummary, Review, VetBooking, VetEarnings } from './vet-dashboard';

// Lets the dashboard be walked through without a Firebase account or a running
// backend. Off unless VITE_DEMO is explicitly set.
export const demoMode = import.meta.env.VITE_DEMO === '1';

export const demoCredentials = { email: 'demo@petcare.id', password: 'demo1234' };

export const demoVetId = 'vet_demo';

export const demoBookings: VetBooking[] = [
  { id: 'bk_2301', ownerId: 'usr_7731', service: 'Vaksinasi rabies', amount: 185000, date: '2026-07-24', status: 'confirmed' },
  { id: 'bk_2299', ownerId: 'usr_5410', service: 'Grooming lengkap', amount: 240000, date: '2026-07-23', status: 'completed' },
  { id: 'bk_2297', ownerId: 'usr_9012', service: 'Konsultasi umum', amount: 120000, date: '2026-07-22', status: 'completed' },
  { id: 'bk_2294', ownerId: 'usr_3388', service: 'Steril kucing', amount: 850000, date: '2026-07-20', status: 'pending' },
  { id: 'bk_2290', ownerId: 'usr_7731', service: 'Cek gigi', amount: 150000, date: '2026-07-18', status: 'cancelled' },
  { id: 'bk_2286', ownerId: 'usr_6644', service: 'Vaksinasi tricat', amount: 210000, date: '2026-07-15', status: 'completed' },
  { id: 'bk_2280', ownerId: 'usr_5410', service: 'Rawat luka', amount: 320000, date: '2026-07-11', status: 'completed' },
  { id: 'bk_2271', ownerId: 'usr_2205', service: 'Konsultasi umum', amount: 120000, date: '2026-06-29', status: 'completed' },
];

const monthly = demoBookings
  .filter(b => b.date.startsWith('2026-07'))
  .reduce((sum, b) => sum + b.amount, 0);

export const demoEarnings: VetEarnings = {
  totalEarnings: monthly + 4_120_000,
  monthlyEarnings: monthly,
  bookingCount: 34,
  lastUpdated: '2026-07-26T03:40:00.000Z',
};

export const demoSummary: RatingSummary = {
  rating: 4.6,
  review_count: 31,
  rating_distribution: { '1': 0, '2': 1, '3': 3, '4': 9, '5': 18 },
};

export const demoReviews: Review[] = [
  {
    id: 'rv_144',
    reviewerId: 'usr_7731',
    targetId: demoVetId,
    type: 'vet',
    rating: 5,
    text: 'Dokternya sabar banget sama kucing saya yang galak. Penjelasannya detail.',
    verified: true,
    helpful_count: 7,
    created_at: '2026-07-24T11:05:00.000Z',
  },
  {
    id: 'rv_141',
    reviewerId: 'usr_5410',
    targetId: demoVetId,
    type: 'vet',
    rating: 4,
    text: 'Hasilnya bagus, cuma nunggu antrian agak lama.',
    verified: true,
    helpful_count: 3,
    created_at: '2026-07-23T08:20:00.000Z',
  },
  {
    id: 'rv_138',
    reviewerId: 'usr_9012',
    targetId: demoVetId,
    type: 'vet',
    rating: 5,
    text: 'Klinik bersih, harga transparan. Bakal balik lagi.',
    verified: false,
    helpful_count: 1,
    created_at: '2026-07-22T15:47:00.000Z',
  },
  {
    id: 'rv_130',
    reviewerId: 'usr_3388',
    targetId: demoVetId,
    type: 'vet',
    rating: 3,
    text: 'Pelayanan oke tapi susah dihubungi lewat telepon.',
    verified: true,
    helpful_count: 5,
    created_at: '2026-07-16T09:12:00.000Z',
  },
];
