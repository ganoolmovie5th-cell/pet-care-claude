'use client';

import React, { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface Payment {
  id: string;
  vet_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  invoice_id: string;
  created_at: string;
  due_date: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [loading, setLoading] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let q = collection(firestore, 'payments');
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
    loadPayments();
  }, []);

  const filtered = payments.filter(p => filter === 'all' || p.status === filter);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payments</h1>
      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'paid', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
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
