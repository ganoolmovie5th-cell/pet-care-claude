'use client';

import React, { useEffect, useState } from 'react';
import { firestore, isDemoMode } from '@/lib/firebase';
import { DEMO_PAYMENTS } from '@/lib/demo-data';
import { collection, getDocs } from 'firebase/firestore';

interface Payment {
  id: string;
  vet_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  invoice_id: string;
  created_at: string;
  due_date: string;
}

type PaymentFilter = 'all' | Payment['status'];

const FILTERS: PaymentFilter[] = ['all', 'pending', 'paid', 'failed'];

export default function PaymentsPage() {
  // Demo data is static, so it seeds initial state instead of going through an
  // effect — that keeps the mount render free of a synchronous setState.
  const [payments, setPayments] = useState<Payment[]>(isDemoMode ? DEMO_PAYMENTS : []);
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [loading, setLoading] = useState(!isDemoMode);

  const loadPayments = async () => {
    try {
      const q = collection(firestore, 'payments');
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Payment[];
      setPayments(data);
    } catch (err) {
      console.error('Error loading payments:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState runs after the await, not during render.
    if (!isDemoMode) loadPayments();
  }, []);

  const filtered = payments.filter(p => filter === 'all' || p.status === filter);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payments</h1>
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
        <table className="w-full bg-white rounded shadow">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Invoice ID</th>
              <th className="text-left p-4">Amount</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(payment => (
              <tr key={payment.id} className="border-b">
                <td className="p-4">{payment.invoice_id}</td>
                <td className="p-4">Rp{payment.amount.toLocaleString('id-ID')}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded text-sm ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="p-4">{new Date(payment.due_date).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
