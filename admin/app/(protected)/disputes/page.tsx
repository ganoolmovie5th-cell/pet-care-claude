'use client';

import React, { useEffect, useState } from 'react';
import { firestore, isDemoMode } from '@/lib/firebase';
import { DEMO_DISPUTES } from '@/lib/demo-data';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface Dispute {
  id: string;
  booking_id: string;
  owner_id: string;
  vet_id: string;
  reason: string;
  status: 'open' | 'resolved' | 'rejected';
  created_at: string;
}

type DisputeFilter = Dispute['status'] | 'all';

const FILTERS: DisputeFilter[] = ['open', 'resolved', 'rejected', 'all'];

export default function DisputesPage() {
  // Demo data is static, so it seeds initial state instead of going through an
  // effect — that keeps the mount render free of a synchronous setState.
  const [disputes, setDisputes] = useState<Dispute[]>(isDemoMode ? DEMO_DISPUTES : []);
  const [filter, setFilter] = useState<DisputeFilter>('open');
  const [loading, setLoading] = useState(!isDemoMode);

  const loadDisputes = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, 'disputes'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Dispute[];
      setDisputes(data);
    } catch (err) {
      console.error('Error loading disputes:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState runs after the await, not during render.
    if (!isDemoMode) loadDisputes();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      if (!isDemoMode) {
        await updateDoc(doc(firestore, 'disputes', id), { status: 'resolved' });
      }
      setDisputes(disputes.map(d => d.id === id ? { ...d, status: 'resolved' } : d));
    } catch (err) {
      console.error('Error resolving dispute:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (!isDemoMode) {
        await updateDoc(doc(firestore, 'disputes', id), { status: 'rejected' });
      }
      setDisputes(disputes.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    } catch (err) {
      console.error('Error rejecting dispute:', err);
    }
  };

  const filtered = disputes.filter(d => filter === 'all' || d.status === filter);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Disputes</h1>
      <div className="mb-4 flex gap-2">
        {FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(dispute => (
            <div key={dispute.id} className="bg-white p-4 rounded shadow">
              <p className="font-semibold">Booking ID: {dispute.booking_id}</p>
              <p className="text-sm text-gray-600">Reason: {dispute.reason}</p>
              <div className="mt-3 flex gap-2">
                <span className={`px-3 py-1 rounded text-sm ${dispute.status === 'resolved' ? 'bg-green-100 text-green-700' : dispute.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {dispute.status}
                </span>
                {dispute.status === 'open' && (
                  <>
                    <button
                      onClick={() => handleResolve(dispute.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleReject(dispute.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
