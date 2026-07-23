'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { getVetDashboard, VetDashboard } from '@/lib/api';
import EarningsChart from '@/components/EarningsChart';
import DashboardShell from '@/components/DashboardShell';
import { getFirestore } from 'firebase/firestore';
import app from '@/lib/firebase';

const db = getFirestore(app);

interface VetProfile {
  subscriptionStatus: string;
  approvedAt?: string;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function EarningsPage() {
  const [dashboard, setDashboard] = useState<VetDashboard | null>(null);
  const [profile, setProfile] = useState<VetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const vetId = auth.currentUser?.uid;
    if (!vetId) return;

    Promise.all([
      getVetDashboard(vetId),
      getDoc(doc(db, 'vets', vetId)),
    ])
      .then(([dash, snap]) => {
        setDashboard(dash);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            subscriptionStatus: data.subscription_status ?? 'active',
            approvedAt: data.approved_at?.toDate?.()?.toLocaleDateString('id-ID') ?? null,
          });
        }
      })
      .catch(() => setError('Gagal memuat data pendapatan.'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Pendapatan</h1>

        {loading && <p className="text-sm text-gray-400">Memuat…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && dashboard && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Pendapatan" value={fmt(dashboard.totalEarnings)} />
              <StatCard label="Bulan Ini" value={fmt(dashboard.monthEarnings)} />
              <StatCard label="Total Pemesanan" value={String(dashboard.totalBookings)} />
            </div>

            <EarningsChart data={dashboard.monthlyBreakdown} />

            {profile && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-gray-700">Status Langganan</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.subscriptionStatus === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {profile.subscriptionStatus === 'active' ? 'Aktif' : profile.subscriptionStatus}
                  </span>
                  {profile.approvedAt && (
                    <span className="text-xs text-gray-400">Disetujui: {profile.approvedAt}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
