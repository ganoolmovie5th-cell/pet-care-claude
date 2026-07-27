# Deployment Guide — Pet Care Community

## Backend (Cloud Run)

### Prerequisites
- GCP project with billing enabled
- `gcloud` CLI installed
- Service account key (JSON) with Cloud Run Editor role

### Deploy via Cloud Build
1. Connect GitHub repo to Cloud Build
2. Push to `main` branch
3. Cloud Build runs `backend/cloudbuild.yaml` automatically
4. Backend deploys to Cloud Run (`pet-care-backend` service)

### Manual Deploy
```bash
cd backend
gcloud auth configure-docker
docker build -t gcr.io/PROJECT_ID/pet-care-backend:latest .
docker push gcr.io/PROJECT_ID/pet-care-backend:latest
gcloud run deploy pet-care-backend \
  --image=gcr.io/PROJECT_ID/pet-care-backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars=FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,...
```

### Environment Variables (Cloud Run)
Set in Cloud Run Console or via CLI:
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_DATABASE_URL=...
JWT_SECRET=...
XENDIT_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Mobile (TestFlight / Google Play)

### Prerequisites
- Apple Developer account
- Google Play Developer account
- EAS account (Expo Application Services)

### Build & Deploy
```bash
cd ../pet-care-mobile-claude
eas build --platform ios --auto-submit
eas build --platform android --auto-submit
```

### TestFlight (iOS)
- Build auto-submitted to TestFlight
- Add testers in App Store Connect
- Share public link via Settings > Internal Testing

### Google Play (Android)
- Build auto-submitted to internal testing
- Promote to beta → production after testing

## Web Dashboard (Vercel)

Vet-facing dashboard. Live: https://www.pet-care.web.id

- **Vercel project:** Root Directory `web`, framework Vite, build `npm run build`, output `dist`
- **Env vars** (Production + Preview):
  ```
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_STORAGE_BUCKET=...
  VITE_FIREBASE_MESSAGING_SENDER_ID=...
  VITE_FIREBASE_APP_ID=...
  VITE_API_BASE_URL=https://<cloud-run-url>
  ```
- Deploys on every push to `main`.
- Until the `VITE_FIREBASE_*` values are real, the dashboard stays in demo mode.

## Admin Panel (Vercel)

Internal ops panel (users, vets, payments, disputes). Live:
https://pet-care-admin-claude.vercel.app

- **Vercel project:** separate project, Root Directory `admin`, framework Next.js
- **Env vars** — same Firebase values as the web dashboard, `NEXT_PUBLIC_` prefixed:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  NEXT_PUBLIC_FIREBASE_APP_ID=...
  ```

### Demo mode

`admin/lib/firebase.ts` sets `isDemoMode` when `NEXT_PUBLIC_FIREBASE_API_KEY` is
missing or still contains `example`. In demo mode the auth guard is skipped and
pages render `lib/demo-data.ts` instead of Firestore. Setting real credentials
turns the guard back on automatically — the bypass cannot survive into a
credentialed deploy.

### Granting admin access

The guard requires a Firebase user with the custom claim `admin: true`.

1. Firebase Console → Authentication → Add user (email + password)
2. Set the claim with the Admin SDK:
   ```bash
   node -e "require('firebase-admin').initializeApp(); \
     require('firebase-admin').auth().setCustomUserClaims('<UID>', {admin:true})"
   ```
3. Sign out and back in — claims only refresh on a new ID token.

## Firestore Security Rules

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

Rules location: `backend/firestore.rules`

## Cloud Functions

Deploy:
```bash
cd backend
firebase deploy --only functions
```

Functions:
- `aggregateVetRating`: On review creation
- `notifyPlaydateInterest`: On interest registration
- `sendVaccinationReminders`: Daily 9 AM UTC

## Monitoring

- **Backend Logs**: Cloud Logging / Cloud Run Console
- **Mobile Crashes**: Firebase Crashlytics dashboard
- **Performance**: Firebase Performance Monitoring
- **Analytics**: Google Analytics + custom events
