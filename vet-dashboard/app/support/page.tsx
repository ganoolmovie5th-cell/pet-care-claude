'use client';

import { useState, FormEvent } from 'react';
import DashboardShell from '@/components/DashboardShell';

const FAQS = [
  {
    q: 'Bagaimana cara mengonfirmasi pemesanan?',
    a: 'Buka halaman Pemesanan, cari pemesanan dengan status "Menunggu", lalu klik Konfirmasi.',
  },
  {
    q: 'Kapan pembayaran akan dikirim ke saya?',
    a: 'Dana dilepaskan setelah sesi selesai dikonfirmasi, biasanya dalam 1–2 hari kerja.',
  },
  {
    q: 'Bagaimana mengubah jadwal layanan saya?',
    a: 'Pergi ke Pengaturan → Profil dan perbarui jam operasional klinik Anda.',
  },
  {
    q: 'Apa yang harus dilakukan jika ada masalah teknis?',
    a: 'Gunakan formulir di bawah ini atau hubungi kami di support@petcare.id.',
  },
];

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // ponytail: TODO backend integration — mailto fallback for now
    setSent(true);
    setSubject('');
    setMessage('');
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Bantuan & Dukungan</h1>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Pertanyaan Umum</h2>
          <div className="flex flex-col gap-2">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-900">{q}</summary>
                <p className="mt-2 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-700">Hubungi Kami</h2>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            {sent ? (
              <p className="text-sm text-green-700">Pesan terkirim! Tim kami akan merespons segera.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Subjek</label>
                  <input
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Pesan</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Kirim Pesan
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
