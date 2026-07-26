'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow mb-6">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Pet Care Admin</h1>
          <div className="flex gap-4">
            <Link href="/users" className="text-blue-600 hover:underline">Users</Link>
            <Link href="/vets" className="text-blue-600 hover:underline">Vets</Link>
            <Link href="/payments" className="text-blue-600 hover:underline">Payments</Link>
            <Link href="/disputes" className="text-blue-600 hover:underline">Disputes</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
