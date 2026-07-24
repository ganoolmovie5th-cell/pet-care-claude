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
