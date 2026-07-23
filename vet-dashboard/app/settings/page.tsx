'use client';

import { useState, FormEvent } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import DashboardShell from '@/components/DashboardShell';

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', phone: '', address: '', bio: '' });
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    // ponytail: TODO persist to Firestore vets/{uid}
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    if (passwords.next !== passwords.confirm) {
      setPwError('Kata sandi baru tidak cocok.');
      return;
    }
    const user = auth.currentUser;
    if (!user?.email) return;
    try {
      const cred = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passwords.next);
      setPwSaved(true);
      setPasswords({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch {
      setPwError('Kata sandi saat ini salah atau sesi telah kedaluwarsa.');
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Pengaturan</h1>

        {/* Profile */}
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-700">Profil</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            {[
              { id: 'name', label: 'Nama Lengkap', type: 'text' },
              { id: 'phone', label: 'Telepon', type: 'tel' },
              { id: 'address', label: 'Alamat Klinik', type: 'text' },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-700">
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  value={profile[id as keyof typeof profile]}
                  onChange={(e) => setProfile((p) => ({ ...p, [id]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label htmlFor="bio" className="mb-1 block text-xs font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Simpan Profil
              </button>
              {profileSaved && <span className="text-sm text-green-700">Tersimpan!</span>}
            </div>
          </form>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-700">Keamanan</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {[
              { id: 'current', label: 'Kata Sandi Saat Ini' },
              { id: 'next', label: 'Kata Sandi Baru' },
              { id: 'confirm', label: 'Konfirmasi Kata Sandi Baru' },
            ].map(({ id, label }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-700">
                  {label}
                </label>
                <input
                  id={id}
                  type="password"
                  required
                  value={passwords[id as keyof typeof passwords]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [id]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Ubah Kata Sandi
              </button>
              {pwSaved && <span className="text-sm text-green-700">Kata sandi diperbarui!</span>}
            </div>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
