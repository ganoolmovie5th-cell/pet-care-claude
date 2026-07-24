# Production Release Checklist — Pet Care Community

## Pre-Release (1 week before)

### Code Quality
- [ ] All Phase 6 tests passing (backend + mobile)
- [ ] Code review completed
- [ ] No console errors/warnings in logs
- [ ] TypeScript strict mode clean

### Security
- [ ] `.env` vars never committed
- [ ] API keys rotated (Xendit, Twilio, JWT_SECRET)
- [ ] Firestore security rules reviewed
- [ ] No hardcoded credentials in code
- [ ] CORS configured properly

### Performance
- [ ] Backend response time < 500ms (P95)
- [ ] Mobile app < 100MB (iOS) / < 150MB (Android)
- [ ] Images optimized (< 200KB each)
- [ ] Database indexes created

### Infrastructure
- [ ] Cloud Run service created & tested
- [ ] Firebase Project configured
- [ ] Cloud Functions deployed
- [ ] BigQuery dataset ready (analytics)
- [ ] Cloud Storage buckets created

## Release Day

### Backend
- [ ] `git tag v1.0.0`
- [ ] Push to main
- [ ] Cloud Build auto-deploys to Cloud Run
- [ ] Health check passing: `GET /health` → 200 OK
- [ ] Backend accessible at production URL

### Mobile (iOS)
- [ ] App Store listing created (name, description, screenshots)
- [ ] Privacy policy URL set
- [ ] Test user credentials provided to App Review
- [ ] `eas build --platform ios --profile production --auto-submit`
- [ ] Review submitted to App Store
- [ ] Expected review: 24-48 hours

### Mobile (Android)
- [ ] Google Play Store listing created
- [ ] Content rating filled
- [ ] Privacy policy URL set
- [ ] Target API level ≥ 34
- [ ] `eas build --platform android --profile production --auto-submit`
- [ ] Review submitted to Google Play
- [ ] Expected review: 2-4 hours

### Communications
- [ ] Beta testers notified of release date
- [ ] Support email configured
- [ ] Documentation published
- [ ] Social media prepared (optional)

## Post-Release (First 24 hours)

### Monitoring
- [ ] Backend logs clean (no 5xx errors)
- [ ] Firebase Crashlytics: 0 critical crashes
- [ ] Database performance: queries < 200ms
- [ ] App Store: no user crashes reported

### User Flow Testing
- [ ] Sign up → Dashboard → Browse Vets → Book → Pay → Review
- [ ] Post Playdate → Match → Chat → Meet
- [ ] Vaccination reminder triggered
- [ ] Notifications received (SMS + push)

### Support
- [ ] Customer support email monitored
- [ ] App Store reviews read
- [ ] Google Play reviews read
- [ ] Feedback loop established

## Rollback Plan

If critical bug found:
1. Disable feature (feature flag or API endpoint)
2. Push hotfix to main
3. Cloud Build auto-deploys
4. Mobile requires manual update (5-24 hours for store review)

For immediate mobile rollback:
- Publish previous version to testing track
- Direct beta testers to downgrade

## Success Metrics (Week 1)

- [ ] 0 critical bugs
- [ ] < 1% crash rate
- [ ] Average rating > 4.0 stars
- [ ] 100+ downloads
- [ ] Support response time < 2 hours
