# Pet Care Community MVP — Design Specification

**Date:** 2026-07-22  
**Product:** Pet Care Community Platform (Indonesia)  
**Scope:** React Native Owner App + Web Vet Dashboard  
**Timeline:** 5-6 weeks solo development  
**Target Y1:** 10K owner + 100 vet/groomer, 5% conversion (Rp500K/mo revenue)

---

## 1. Executive Summary

Pet Care Community is a freemium marketplace platform connecting pet owners with vets, groomers, and other pet owners. MVP includes 4 core features:
1. **Vet Marketplace** — browse, book, rate vets/clinics
2. **Health Passport** — digital pet health records with vaccination reminders
3. **Playdate Community** — pet owner meetup matching and coordination
4. **Insurance Aggregator** — comparison and direct links to pet insurance partners

**Revenue:** Freemium (owner Rp100K/mo subscription), free vet marketplace (pilots 50-100 vets Jakarta), insurance commission (future).

**Architecture:** React Native frontend + Node.js/Firebase backend, Xendit payments, Firebase Cloud Messaging notifications.

---

## 2. Problem Statement

**Pet Owner Pain Points (Urban Indonesia, 1-1.5M target):**
- Vet quality scattered; no reviews, long response times (hours/days via WhatsApp)
- Pet health tracking manual (paper, memory, scattered notes)
- No easy way to find playdate partners for pets
- Pet insurance unknown/inaccessible locally

**Vet/Groomer Pain Points (5K+ potential partners):**
- No unified booking platform; manual scheduling via phone/WhatsApp
- Income inconsistent, hard to forecast demand
- No customer data history or retention tools

**Current Workarounds:** Facebook groups (chaos), Instagram DM, Google Maps (outdated), WhatsApp direct contact.

**Market Opportunity:** No local unified pet care platform; incumbent Tokopet is e-commerce only.

---

## 3. Product Vision

**Tagline:** One app for all pet care — book vet, track health, find playdate friends, compare insurance.

**User Personas:**

**Owner (Primary):**
- Age 25-35, Jakarta/Surabaya urban, Rp200M+ income
- Pet (dog/cat) = family member; willing to spend Rp50-300K/service
- Mobile-first, e-wallet payments, community-driven (social sharing)
- Pain: scattered services, no health history, pet isolation

**Vet/Groomer (Secondary, B2B):**
- Clinic/salon owner or staff
- 10-100 bookings/month, manual scheduling frustration
- Want online visibility + booking automation
- Pain: inconsistent income, customer acquisition cost high

**Playdate Owner (Community):**
- Same as Owner, but motivated by pet socialization
- Want safe, trusted meetups; fear of dog aggression, accidents

---

## 4. Core Features (MVP)

### 4.1 Vet Marketplace

**Owner Perspective:**
- Browse vets/clinics by location (map + list view)
- Filter: specialty (general, dermatology, surgery, exotic), rating, distance
- View vet profile: photo, hours, specialties, reviews, consultation fee
- Book appointment: select date/time slot, add pet, payment, confirmation
- Pre-visit chat: ask questions (diet, bring vaccine records, cost estimate)
- Post-visit rating and review
- Video consultation option (future, not MVP)

**Vet Dashboard (Web):**
- Clinic profile setup: name, location, photo, specialties, hours
- Calendar: create available slots (block times)
- Booking list: owner info, pet history, check-in/checkout
- Analytics: bookings/month, no-show rate, revenue
- Manual integration: can accept booking, but also can respond via SMS (low friction)

**Data Model:**
```
vets/ {vetId}
  - clinic_name, location (lat/lng), specialties, hours
  - rating (avg), review_count
  - consultation_fee, policies
  - created_at

bookings/ {bookingId}
  - ownerId, petId, vetId, date, time
  - status: pending/confirmed/completed/cancelled
  - payment_status: pending/paid
  - notes (owner pre-visit question)
  - created_at, updated_at
```

**Payment Flow:**
- Owner book → pay via Xendit (bank transfer, e-wallet)
- Vet confirm → payment held in escrow (2-3 days post-visit)
- Owner can refund within 24h of confirmation

**Revenue:** Free MVP1 (pilot phase), Rp300-500K/mo vet subscription (future), or 15% commission per booking.

---

### 4.2 Health Passport

**Owner Perspective:**
- Add pet: name, breed, age, photo, microchip (optional)
- Health records: add vaksin, check-up, medication, surgery
- Vaccination timeline: auto-calculate next due date
- Reminders: push + SMS before due (7 days, 1 day before)
- Export: generate PDF health passport (shareable to vet)
- Search: quick recall past records (e.g., "when was last rabies?")

**Data Model:**
```
pets/ {petId}
  - ownerId, name, breed, age, photo, microchip
  - createdAt

health_records/ {recordId}
  - petId, date, type (vaksin/checkup/medication/surgery), note, vet_name
  - for vaksin: name, next_due_date
  - createdAt

reminders/ {reminderId}
  - petId, type, due_date, status (pending/sent/acknowledged)
```

---

### 4.3 Playdate Community

**Owner Perspective:**
- Feed: browse nearby pet posts (name, breed, age, photo, location, date, description)
- Filter: breed, age range, location (radius), date
- Post pet: "Pug, 2yo, free Saturday afternoon, Senayan. Looking for chill playmates"
- Interested: browse interested owners, chat to confirm
- Meetup: confirm location + time, share contact info
- Photo share: post photos after playdate, community feed

**Data Model:**
```
playdate_posts/ {postId}
  - ownerId, petId, location (lat/lng), date, description
  - interested_owners: [uid1, uid2, ...]
  - status: active/completed/cancelled
  - created_at

playdate_chat/ {chatId}
  - postId, ownerId, interestedOwnerId
  - messages: [{sender, text, timestamp}]
```

---

### 4.4 Insurance Aggregator

**Owner Perspective:**
- Widget on home: "Protect your pet — compare insurance"
- Show 2-3 partner options (name, coverage, price, rating)
- Click → redirect to partner website (external link, no app integration MVP1)

---

## 5. Architecture

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React Native | iOS + Android from single codebase |
| **Backend** | Node.js + Express | Lightweight, rapid iteration |
| **Database** | Firebase Firestore + Realtime DB | Managed, offline-first, geo-queries |
| **Auth** | Firebase Auth (phone OTP) | SMS-native familiar Indonesia |
| **Payment** | Xendit | Local gateway, e-wallet + bank support |
| **Notifications** | Firebase Cloud Messaging + Twilio SMS | Push + SMS for reminders |
| **Storage** | Firebase Cloud Storage | Pet photos, PDF export |

---

## 6. Security & Compliance

### Authentication
- Phone OTP (6-digit, 10-min expiry, Firebase Auth)
- Session JWT (7-day expiry + refresh token)
- No password storage

### Data Protection
- Pet health = private (owner only)
- Vet profile = public (searchable)
- Playdate post = owner can delete
- Payment: Xendit handles (PCI-DSS), app never stores card

### Indonesia Compliance
- **PDP:** Privacy policy explicit, user consent
- **Payment:** Xendit (OJK-licensed)
- **Pet health:** Not regulated (pet ≠ human); standard TLS + at-rest encryption
- **Tax:** VAT on Rp100K subscription (if PKP)

### Abuse Prevention
- Booking spam: Flag after 3 cancellations/week
- Playdate spam: Report + mod review
- Fake vet: Phone verification + manual onboarding

---

## 7. Testing Strategy

### Unit Tests (Jest)
- Auth, booking, health, playdate logic

### Integration Tests (Firebase Emulator)
- Booking flow, health reminder, playdate matching

### E2E Tests (React Native Testing Library + Detox)
- Full user flows: signup, vet book, health add, playdate post

### Manual UAT
- 50 vet + 500 owner beta (Jakarta, 2 weeks)

### Load Testing
- 10K concurrent users, 1K bookings/min

---

## 8. Go-to-Market Strategy

### Phase 1: Vet Pilot (Week 1-2)
- Recruit 50-100 vets in Jakarta (on-ground visits, WhatsApp, petshop referral)
- Free 3 months (remove friction)

### Phase 2: Owner Launch (Week 1-3, parallel)
- Beta invite: 5K owner (Instagram ads, pet influencer seeding)
- Free playdate + health passport
- Rp100K/mo subscription optional

### Phase 3: Iterate (Week 4-6)
- Daily feedback loop, top 3 blockers
- Expand to Surabaya

---

## 9. Success Metrics (Y1)

| Metric | Target |
|--------|--------|
| Owner signup | 10K |
| Vet partners | 100 |
| Bookings/month | 500+ |
| Health records/owner | 5+ |
| Playdate post/week | 100+ |
| Subscription conversion | 5% |
| Monthly churn | <30% |
| NPS | >40 |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Vet adoption slow | On-ground sales, phone support, free 3mo |
| Playdate UX basic | Acceptable MVP; iterate after feedback |
| Booking failures | 24h support, obsess over success rate |
| Payment friction | Support 5 methods (bank, GCash, OVO, DANA, GoPay) |
| Playdate liability | Clear waiver in-app, insurance upsell |

---

## 11. Out of Scope (Post-MVP)

- Video consultation
- AI pet health analysis
- Supply shop
- Mobile vet dashboard
- Multi-pet family plans
- International expansion
- Blockchain/NFT

---

## 12. Success Definition

**MVP1 shipped when:**
- ✅ Owner app: auth, vet browse/book, health passport, playdate feed, insurance link
- ✅ Vet dashboard: clinic profile, calendar, booking list
- ✅ 50 vet partners onboarded + tested
- ✅ 5K owner beta signed up
- ✅ Zero critical bugs in core flows
- ✅ NPS >30 from beta testers
- ✅ 5+ bookings/day consistent

**Ready to scale when:**
- ✅ Churn <30% over 30 days
- ✅ Subscription 3-5% conversion
- ✅ Vet retention 80%+
- ✅ NPS >40
