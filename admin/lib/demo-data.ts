// Sample data shown while isDemoMode is active (Firebase creds still
// placeholders). Never used once real credentials are configured.

export const DEMO_USERS = [
  {
    uid: 'demo_user_1',
    name: 'Budi Santoso',
    phone: '+628123456789',
    email: 'budi@example.com',
    flagged: false,
    subscription_status: 'premium',
    created_at: '2026-06-01T09:00:00Z',
  },
  {
    uid: 'demo_user_2',
    name: 'Sari Wijaya',
    phone: '+628198765432',
    email: 'sari@example.com',
    flagged: false,
    subscription_status: 'free',
    created_at: '2026-06-12T14:30:00Z',
  },
  {
    uid: 'demo_user_3',
    name: 'Andi Pratama',
    phone: '+628111222333',
    email: 'andi@example.com',
    flagged: true,
    subscription_status: 'free',
    created_at: '2026-07-02T11:15:00Z',
  },
];

export const DEMO_VETS = [
  {
    id: 'demo_vet_1',
    clinic_name: 'Klinik Hewan Sehat',
    location: 'Jakarta Selatan',
    email: 'kliniksehat@example.com',
    phone: '+62215551234',
    status: 'approved' as const,
    subscription_status: 'active',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'demo_vet_2',
    clinic_name: 'Pet Care Bandung',
    location: 'Bandung',
    email: 'petcarebdg@example.com',
    phone: '+62225556789',
    status: 'pending' as const,
    subscription_status: 'inactive',
    created_at: '2026-07-10T10:45:00Z',
  },
];

export const DEMO_PAYMENTS = [
  {
    id: 'demo_pay_1',
    vet_id: 'demo_vet_1',
    amount: 150000,
    status: 'paid' as const,
    invoice_id: 'INV-2026-0001',
    created_at: '2026-07-15T13:00:00Z',
    due_date: '2026-07-22T13:00:00Z',
  },
  {
    id: 'demo_pay_2',
    vet_id: 'demo_vet_2',
    amount: 250000,
    status: 'pending' as const,
    invoice_id: 'INV-2026-0002',
    created_at: '2026-07-20T09:30:00Z',
    due_date: '2026-07-27T09:30:00Z',
  },
];

export const DEMO_DISPUTES = [
  {
    id: 'demo_dispute_1',
    booking_id: 'demo_booking_1',
    owner_id: 'demo_user_3',
    vet_id: 'demo_vet_1',
    reason: 'Jadwal dibatalkan sepihak oleh klinik',
    status: 'open' as const,
    created_at: '2026-07-18T16:20:00Z',
  },
];
