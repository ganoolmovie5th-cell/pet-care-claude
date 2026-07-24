# Phase 6 — Reviews, Geo-Matching, Recommendations & FCM

**Date:** 2026-07-24  
**Timeline:** 1-2 weeks  
**Scope:** Post-MVP features for user engagement, trust, and discovery  
**Target:** Beta feedback integration, increased booking conversions, higher retention

---

## 1. Overview

Phase 6 adds four interconnected features to boost engagement and trust:

1. **Reviews Service** — Vet/owner ratings, review aggregation, trust signals
2. **Geo-Matching Algorithm** — Smart playdate matching by location + breed + preferences
3. **Recommendations Engine** — Personalized vet suggestions based on history + ratings
4. **FCM Notifications** — Push notifications for bookings, playdate matches, reminders

---

## 2. Reviews Service

### 2.1 Data Model

```firestore
reviews/ {reviewId}
  - reviewerId (ownerId)
  - vetId (or ownerId for playdate review)
  - bookingId (optional, ties review to booking)
  - rating (1-5)
  - text (review comment, max 500 chars)
  - verified (true if from completed booking)
  - helpful_count (upvotes)
  - created_at
  - updated_at

vets/{vetId}
  - rating (float: avg of all reviews, cached)
  - review_count (cached for perf)
  - rating_distribution (1-star, 2-star, etc, cached)
```

### 2.2 Endpoints (Backend)

**POST /reviews**
```
{
  reviewerId: string (JWT user)
  targetId: string (vetId or ownerId for playdate)
  type: 'vet' | 'owner'
  bookingId?: string
  rating: number (1-5)
  text?: string
}
→ { id, created_at }
```

**GET /reviews/:targetId**
```
Query: type=vet|owner, sort=recent|helpful|rating, page, limit
→ { reviews: [...], avg_rating, total_count }
```

**GET /vets/:vetId/summary**
```
→ { rating, review_count, distribution: {1,2,3,4,5}, recent_reviews: [...] }
```

**POST /reviews/:reviewId/helpful** (upvote)
```
→ { helpful_count }
```

### 2.3 Mobile UI

**ReviewScreen** (post-booking)
- Star rating input (1-5)
- Text field (optional)
- Submit button
- Confirmation: "Review submitted — thanks!"

**VetDetailScreen** enhancement
- Show rating badge (⭐ 4.8 • 23 reviews)
- Expandable review list (recent + helpful)
- Helpful upvote button per review
- Filter: All, 5-star, 4-star, 3-star, etc.

### 2.4 Caching & Aggregation

- Vet rating cached in `vets/{vetId}` (updated on review write)
- Cloud Function triggered on review creation:
  - Recalc avg rating, count, distribution
  - Update vet doc
- TTL: realtime (no stale data)

### 2.5 Abuse Prevention

- Only verified bookings can review
- Max 1 review per booking
- Flag for spam/inappropriate content (manual mod review, not auto)

---

## 3. Geo-Matching Algorithm

### 3.1 Playdate Matching

**Goal:** Suggest matching playdate partners based on:
- Proximity (within radius_km)
- Breed compatibility (similar breeds)
- Age range (within ±2 years)
- Schedule (date overlap)
- Vet history (premium subscribers first)

### 3.2 Endpoint

**GET /playdate/matches?lat={lat}&lng={lng}&petId={petId}&radiusKm=5**

```
Query params:
  lat, lng (required)
  petId (to get pet breed/age)
  radiusKm (default: 5, max: 20)
  sort: 'score' | 'recent' (default: score)

→ {
  matches: [
    {
      postId, ownerId, petName, breed, age, photo,
      distance_km, location, date, description,
      match_score (0-100)
    }
  ]
}
```

### 3.3 Matching Algorithm

**Match Score = (100 - distance_penalty) + breed_bonus + age_bonus + subscription_bonus**

- **distance_penalty** = (distance_km / radiusKm) * 40 (0-40 points)
- **breed_bonus** = 20 if same breed, 10 if similar (dogs: all grouped), 0 if cat/dog
- **age_bonus** = 10 if within 2 years, 5 if within 5 years, 0 otherwise
- **subscription_bonus** = 5 if premium subscriber
- **Cap:** 100 points max

**Sort:** By match_score descending

### 3.4 Geo-Indexing

Firestore supports geo-distance queries natively via extension or custom:

**Option A (Lazy):** In-memory filtering
```ts
const matches = allPosts.filter(p => {
  const dist = geoDistance(lat, lng, p.location.lat, p.location.lng);
  return dist <= radiusKm;
}).map(p => ({ ...p, distance_km: dist, match_score: calculateScore(...) }))
```

**Option B (Production):** Firestore geo extension (future)
- Install: `firebase ext:install firestore-geohashing-firestore`
- Pre-compute geohash on write, query by geohash + radius

**MVP:** Use Option A (simpler, works for <10K posts)

### 3.5 Mobile Integration

**PlaydateDiscoverScreen** enhancement
- Map view: show nearby posts as pins
- List view: sorted by match_score
- Filter card: breed, age range, distance slider, date picker
- Tap post → details + "Interested" button
- Click "Interested" → add to post.interested_owners

---

## 4. Recommendations Engine

### 4.1 Endpoint

**GET /recommendations/vets?lat={lat}&lng={lng}&petId={petId}**

```
Query params:
  lat, lng (required, owner location)
  petId (to infer pet type + history)
  limit (default: 10)

→ {
  recommended_vets: [
    {
      vetId, clinic_name, location, distance_km,
      rating, review_count, specialties, consultation_fee,
      rank_reason: 'Similar bookings', 'High rated', 'Nearby'
    }
  ]
}
```

### 4.2 Ranking Algorithm

**Score = (100 - distance) + rating_bonus + history_bonus + spec_bonus**

- **distance** = (distance_km / 10) * 30 (0-30 points, capped at owner's search radius)
- **rating_bonus** = avg_rating * 10 (0-50 points)
- **history_bonus** = 10 if owner has booking history with this vet, 20 if owned pet type matches vet specialty
- **spec_bonus** = 15 if vet has relevant specialties (e.g., dermatology for itchy dogs)

**Sort:** By score descending, then distance ascending

### 4.3 Data Requirements

- Owner location (from booking history or profile)
- Vet location (in vet doc)
- Owner pet type (from pets collection)
- Vet specialties (in vet doc)
- Vet rating (cached from reviews)

### 4.4 Mobile Integration

**VetBrowseScreen** enhancement
- Show "Recommended for you" section at top
- Show rank reason badge: "High Rated", "Nearby", "Similar Bookings"
- Still allow manual search/filter

---

## 5. FCM Notifications

### 5.1 Architecture

**Components:**
1. FCM tokens (device-specific, tied to user)
2. Backend notification service (send via Firebase Admin SDK)
3. Mobile listener (receive + display)
4. Notification queue (reliability)

### 5.2 Data Model

```firestore
fcm_tokens/ {tokenId}
  - userId
  - token (FCM token string)
  - device (iOS | Android)
  - created_at
  - last_used

user_notifications/ {notificationId}
  - userId
  - type: 'booking' | 'playdate_match' | 'reminder' | 'message'
  - title, body, data (JSON)
  - sent_at
  - read_at (nullable)
  - deeplink (for navigation)
```

### 5.3 Notification Types

| Event | Trigger | Message |
|-------|---------|---------|
| **Booking Confirmed** | Owner books → Payment Success | "🎉 Booking confirmed with {vet} on {date}!" |
| **Booking Reminder** | 1 day before appointment | "Reminder: {pet} appointment with {vet} tomorrow at {time}" |
| **Playdate Match** | Owner posts → Another owner interested | "👀 {owner} is interested in playdating with {pet}!" |
| **Vaccination Due** | 7 days before health record due_date | "🩺 {pet}'s {vaccine} is due in 7 days — book now" |
| **Chat Message** | Playdate chat received | "{owner}: {preview}" |
| **Booking Status Change** | Vet confirms/cancels | "🐕 {vet} {action} your {date} appointment" |

### 5.4 Backend API

**POST /notifications/send** (internal, Cloud Function)
```ts
{
  userId: string,
  type: 'booking' | 'playdate_match' | 'reminder',
  title: string,
  body: string,
  data?: { bookingId, postId, vetId, ... },
  deeplink?: string
}
```

**POST /fcm/register-token** (mobile)
```ts
{ token: string, device: 'iOS' | 'Android' }
```

**GET /notifications** (list user notifications)
```ts
Query: limit, offset, unread_only
→ { notifications: [...], unread_count }
```

**PATCH /notifications/:notificationId/read**
```ts
→ { read_at }
```

### 5.5 Mobile Implementation

**FCM Setup (useNotifications hook)**
```ts
useEffect(() => {
  // Request permission
  const permission = await messaging.requestPermission();
  if (permission === 'granted') {
    // Get token
    const token = await messaging.getToken();
    await api.post('/fcm/register-token', { token, device: 'iOS' });
  }
  
  // Listen for messages
  const unsubscribe = messaging.onMessage((message) => {
    // Handle foreground notification
    showLocalNotification(message);
    // Update app state or navigate
  });
  
  return unsubscribe;
}, []);
```

**Local Notification Display**
- Use `react-native-notifee` for rich notifications
- Deep linking: tap notification → navigate to booking/playdate/health record

### 5.6 Notification Queue (Reliability)

**Problem:** FCM delivery not 100% guaranteed (can fail if user offline)

**Solution:** Queue + retry
```ts
// On send failure, queue in Realtime DB:
realtime.ref('/notification_queue').push({
  userId, type, title, body, data,
  attempts: 0, max_attempts: 3, created_at
});

// Cloud Function polls queue, retries every 5 min for 24h
```

### 5.7 Opt-In/Opt-Out

**Settings screen:**
- Toggle: "Booking reminders"
- Toggle: "Playdate matches"
- Toggle: "Health reminders"
- Toggle: "Chat messages"
- Frequency: "All", "Daily digest", "Never"

---

## 6. Integration with Existing Features

### 6.1 Booking Flow (Enhanced)

1. Owner books → payment success
2. **Trigger:** POST /notifications/send (booking confirmation)
3. 24h before: **Trigger:** Scheduled Cloud Function → reminder notification

### 6.2 Playdate Flow (Enhanced)

1. Owner interested in post
2. **Trigger:** POST /notifications/send (playdate match)
3. Chat message sent
4. **Trigger:** POST /notifications/send (chat message)

### 6.3 Health Records (Enhanced)

1. Health record added with next_due_date
2. **Trigger:** Cloud Function checks daily, 7 days before → reminder notification

---

## 7. Testing Strategy

### Backend
- Unit: Review aggregation, geo-distance calc, recommendation scoring
- Integration: FCM token registration, notification queue

### Mobile
- Unit: Notification parsing, deep linking
- E2E: Send notification → receive → tap → navigate

---

## 8. Performance Considerations

| Feature | Issue | Solution |
|---------|-------|----------|
| Reviews | Aggregating 1000s of reviews on each vet read | Cache in vet doc, update on write via Cloud Function |
| Geo-matching | Filtering all posts by distance | In-memory filter MVP, Firestore geo extension if >100K posts |
| Recommendations | Scoring all vets for each user | In-memory scoring OK for <1K vets, consider caching if scale |
| FCM | Token churn, expired tokens | Cleanup on failure, refresh on app open |

---

## 9. Beta Feedback Integration

**Collect feedback on:**
- Review quality (are reviews helpful?)
- Playdate match accuracy (are suggestions relevant?)
- Notification timing (too many? not enough?)
- Vet recommendation relevance (do owners book recommended vets?)

**Measure:**
- Review count/vet (target: 3+ per vet by end of beta)
- Playdate match click-through (target: >30%)
- Notification engagement (target: >50% open rate)
- Recommendation conversion (target: >20% book a recommended vet)

---

## 10. Rollout Plan

### Week 1
- [ ] Design spec + data models
- [ ] Reviews service (backend + mobile)
- [ ] FCM notification infrastructure

### Week 2
- [ ] Geo-matching + recommendations
- [ ] Beta feedback loop
- [ ] Performance tuning + bug fixes

**Gate:** All 4 features stable, beta testers report improved booking + playdate engagement
