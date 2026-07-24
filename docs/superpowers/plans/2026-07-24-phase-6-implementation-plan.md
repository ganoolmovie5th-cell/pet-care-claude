# Phase 6 Implementation Plan

**Status:** Backend complete, mobile in progress

---

## Backend (✅ COMPLETE)

### Services Created
- ✅ `/backend/src/services/review.ts` — Review CRUD, rating aggregation
- ✅ `/backend/src/services/geo-matching.ts` — Playdate match scoring algorithm
- ✅ `/backend/src/services/recommendations.ts` — Vet recommendation ranking
- ✅ `/backend/src/services/notifications.ts` (enhanced) — FCM token management, notification sending

### Routes Created
- ✅ `/backend/src/routes/reviews.ts` — POST /reviews, GET /reviews/:targetId, GET /vets/:vetId/summary, POST /reviews/:reviewId/helpful
- ✅ `/backend/src/routes/playdate-matches.ts` — GET /playdate/matches?lat=X&lng=Y&petId=Z&radiusKm=5
- ✅ `/backend/src/routes/recommendations.ts` — GET /recommendations/vets?ownerId=X&lat=Y&lng=Z&petId=P
- ✅ `/backend/src/routes/fcm.ts` — POST /fcm/register-token, GET /fcm/notifications, PATCH /fcm/notifications/:id/read

### Route Registration
- ✅ Updated `/backend/src/index.ts` to register all new routes

---

## Mobile (🚧 IN PROGRESS)

### TODO: Services

**review.ts**
```ts
// Mobile API client for reviews
export const createReview = (targetId: string, rating: number, text?: string, bookingId?: string)
export const getReviewsForVet = (vetId: string) → Review[]
export const markReviewHelpful = (reviewId: string)
```

**notifications.ts** (FCM)
```ts
// FCM token management
export const registerFCMToken = (userId: string, token: string, device: 'iOS' | 'Android')
export const requestNotificationPermission = () → boolean
export const getUserNotifications = (userId: string) → UserNotification[]
export const markNotificationRead = (notificationId: string)
```

**geo-matching.ts** (playdate)
```ts
// Playdate matching
export const getPlaydateMatches = (lat: number, lng: number, petId: string, radiusKm: number) → PlaydateMatch[]
```

**recommendations.ts** (vet suggestions)
```ts
// Vet recommendations
export const getRecommendedVets = (ownerId: string, lat: number, lng: number, petId: string) → RecommendedVet[]
```

### TODO: Screens

**ReviewScreen.tsx**
- Star rating input (1-5)
- Optional text field (500 char limit)
- Submit button
- Success message
- Triggered after booking.status === 'completed'

**VetDetailScreen enhancements**
- Show rating badge (⭐ 4.8 • 23 reviews)
- Review list (expandable)
- Helpful upvote per review
- Filter reviews by rating

**PlaydateDiscoverScreen enhancements**
- Show matched posts sorted by `match_score`
- Display distance + match score badge
- Filter by: breed, age range, distance slider

**VetBrowseScreen enhancements**
- "Recommended for you" section at top
- Show `rank_reason` badge per vet (High Rated, Nearby, Similar Bookings)

### TODO: Hooks

**useNotifications**
```ts
// Initialize FCM on app startup
useEffect(() => {
  if (!hasPermission) requestNotificationPermission()
  const token = await messaging.getToken()
  await registerFCMToken(user.id, token, device)
  
  // Listen for messages
  const unsubscribe = messaging.onMessage((message) => {
    handleForegroundNotification(message)
  })
}, [])
```

**useRecommendations**
```ts
const { recommendations, loading, error } = useRecommendations(ownerId, petId)
// Call GET /recommendations/vets
```

**usePlaydateMatches**
```ts
const { matches, loading, error } = usePlaydateMatches(lat, lng, petId, radiusKm)
// Call GET /playdate/matches
```

### TODO: Integration Points

1. **BookingConfirmScreen** → Add ReviewScreen link after booking completed
2. **App.tsx (startup)** → Initialize FCM, request permissions
3. **VetBrowseScreen** → Add recommendations section at top
4. **PlaydateDiscoverScreen** → Fetch matches instead of all posts, sort by score
5. **VetDetailScreen** → Display and sort reviews

---

## Testing

### Backend Tests (Jest)
- [ ] Review aggregation: 10 reviews → avg rating 4.5
- [ ] Geo-matching: 3 posts within 5km → correct distance calc + score ranking
- [ ] Recommendations: owner with booking history + premium subscription → ranked higher
- [ ] FCM: token registration → query by userId returns tokens

### Mobile Tests (Jest + React Native Testing Library)
- [ ] ReviewScreen: submit 5-star + text → API called with correct payload
- [ ] useNotifications hook: permission denied → doesn't crash
- [ ] PlaydateMatches: 10 posts → sorted by match_score descending
- [ ] Recommendations: 5 vets → sorted by recommendation_score descending

### E2E Tests
- [ ] Complete booking → ReviewScreen appears → submit review → vet rating updates
- [ ] Post playdate → get matches → tap match → interested notification
- [ ] Browse vets → see recommendations → tap recommended vet → book

---

## Performance Checklist

- [ ] Geo-matching: <500ms for 100 posts (in-memory filtering)
- [ ] Recommendations: <1s for 100 vets (in-memory scoring)
- [ ] Reviews: Load 10 reviews <500ms (paginated)
- [ ] FCM: <5s token registration
- [ ] Mobile: Notification received <10s after sent

---

## Next Steps (Week 2)

1. Implement mobile review service + ReviewScreen
2. Implement mobile FCM hook + permissions
3. Integrate recommendations into VetBrowseScreen
4. Integrate geo-matching into PlaydateDiscoverScreen
5. Run E2E tests with beta testers
6. Collect feedback on review quality, match accuracy, notification timing
7. Tune algorithms based on feedback
8. Performance optimization if needed

---

## Beta Feedback Collection

**Metrics to track:**
- Review count/vet (target: 3+ per vet)
- Playdate match click-through (target: >30%)
- Notification open rate (target: >50%)
- Recommendation conversion (target: >20%)

**Collect via:**
- In-app survey: "How helpful were these matches?"
- Analytics: Track which recommended vets are booked
- Support: Any complaints about notifications?
