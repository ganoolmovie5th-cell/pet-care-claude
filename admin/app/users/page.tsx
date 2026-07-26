'use client';

import React, { useEffect, useState } from 'react';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface User {
  uid: string;
  phone?: string;
  name?: string;
  email?: string;
  flagged?: boolean;
  subscription_status?: string;
  created_at?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, 'users'));
      const data = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleFlag = async (uid: string, flagged: boolean) => {
    try {
      await updateDoc(doc(firestore, 'users', uid), { flagged: !flagged });
      setUsers(users.map(u => u.uid === uid ? { ...u, flagged: !flagged } : u));
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const filtered = users.filter(u => 
    (u.phone?.includes(search) || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.includes(search))
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <input
        type="text"
        placeholder="Search by phone, name, or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 p-3 border rounded"
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(user => (
            <div key={user.uid} className="bg-white p-4 rounded shadow">
              <p className="font-semibold">{user.name || 'N/A'}</p>
              <p className="text-sm text-gray-600">{user.phone}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="mt-3 flex gap-2">
                <span className={`px-3 py-1 rounded text-sm ${user.flagged ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {user.flagged ? 'Flagged' : 'Active'}
                </span>
                <button
                  onClick={() => handleFlag(user.uid, user.flagged || false)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
                >
                  {user.flagged ? 'Unflag' : 'Flag'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
