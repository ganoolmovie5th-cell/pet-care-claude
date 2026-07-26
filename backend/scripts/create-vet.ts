import 'dotenv/config';

// Usage: npm run create-vet -- <email> <password> <vetId> [clinic_name]
//
// The web dashboard needs a Firebase user whose custom claim `custom.vet`
// equals the Firestore vets/<vetId> document id -- see
// src/middleware/vetAuth.ts, which rejects any token where those two differ.
// Nothing else in the codebase sets that claim, so vet accounts can only be
// created here.

const [email, password, vetId, clinicName] = process.argv.slice(2);

if (!email || !password || !vetId) {
  console.error('Usage: npm run create-vet -- <email> <password> <vetId> [clinic_name]');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Firebase rejects passwords shorter than 6 characters.');
  process.exit(1);
}

// Imported after the argument checks because src/config/firebase.ts calls
// initializeApp() at module load and throws when credentials are absent, which
// would hide the usage message.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { auth, db } = require('../src/config/firebase') as typeof import('../src/config/firebase');

const getOrCreateUser = async () => {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password });
    console.log(`Reusing existing auth user ${existing.uid}, password reset.`);
    return existing;
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({ email, password, emailVerified: false });
    console.log(`Created auth user ${created.uid}.`);
    return created;
  }
};

const main = async () => {
  const user = await getOrCreateUser();

  await auth.setCustomUserClaims(user.uid, { custom: { vet: vetId } });

  const now = new Date().toISOString();
  const vetRef = db.collection('vets').doc(vetId);
  const existing = await vetRef.get();

  if (existing.exists) {
    await vetRef.update({ email, status: 'approved', approved_at: now });
    console.log(`Updated existing vets/${vetId} to approved.`);
  } else {
    // ponytail: placeholder clinic details, edit in Firestore after creating
    await vetRef.set({
      clinic_name: clinicName || 'Klinik Hewan',
      location: { lat: -6.2088, lng: 106.8456, city: 'Jakarta', address: 'Jl. Contoh No. 1' },
      specialties: ['dog', 'cat'],
      hours: { open: '09:00', close: '17:00' },
      rating: 0,
      review_count: 0,
      consultation_fee: 150000,
      phone: '+628123456789',
      email,
      status: 'approved',
      subscription_id: null,
      subscription_status: 'pending',
      approved_at: now,
      created_at: now,
    });
    console.log(`Created vets/${vetId}.`);
  }

  console.log(`\nDone. Log in at the dashboard with ${email}.`);
  console.log(`Claim custom.vet = ${vetId}. Existing sessions must sign out and back in`);
  console.log('before the new claim appears in their ID token.');
};

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
