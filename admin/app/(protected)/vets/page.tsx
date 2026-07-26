'use client';

import React, { useEffect, useState } from 'react';
import { firestore, auth } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface Vet {
  id: string;
  clinic_name: string;
  location: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'blocked';
  subscription_status: string;
  subscription_id?: string;
  created_at: string;
}

export default function VetsPage() {
  const [vets, setVets] = useState<Vet[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadVets = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, 'vets'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Vet[];
      setVets(data);
    } catch (err) {
      console.error('Error loading vets:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVets();
  }, []);

  const handleApprove = async (vetId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`https://us-central1-pet-care-prod.cloudfunctions.net/admin/vet/${vetId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setVets(vets.map(v => v.id === vetId ? { ...v, status: 'approved' } : v));
      }
    } catch (err) {
      console.error('Error approving vet:', err);
    }
  };

  const handleBlock = async (vetId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`https://us-central1-pet-care-prod.cloudfunctions.net/admin/vet/${vetId}/block`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setVets(vets.map(v => v.id === vetId ? { ...v, status: 'blocked' } : v));
      }
    } catch (err) {
      console.error('Error blocking vet:', err);
    }
  };

  const filtered = vets.filter(v => 
    v.clinic_name.toLowerCase().includes(search.toLowerCase()) || v.location.includes(search)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Vets</h1>
      <input
        type="text"
        placeholder="Search by clinic name or location"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 p-3 border rounded"
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(vet => (
            <div key={vet.id} className="bg-white p-4 rounded shadow">
              <p className="font-semibold">{vet.clinic_name}</p>
              <p className="text-sm text-gray-600">{vet.location}</p>
              <p className="text-sm text-gray-600">{vet.email}</p>
              <div className="mt-3 flex gap-2">
                <span className={`px-3 py-1 rounded text-sm ${vet.status === 'approved' ? 'bg-green-100 text-green-700' : vet.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {vet.status}
                </span>
                {vet.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(vet.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleBlock(vet.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Block
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
