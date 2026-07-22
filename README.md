# Pet Care Community — Web Dashboard & Backend API

**Status:** MVP Implementation  
**Timeline:** 5-6 weeks solo development  
**Target:** 10K owners + 100 vet pilots (Jakarta), 5% subscription conversion (Rp500K/mo revenue)

## Overview

Pet Care Community is a freemium marketplace platform connecting Indonesian pet owners with vets, groomers, and other pet owners. This repository contains the **web vet dashboard** and **Node.js/Firebase backend API** for the MVP.

The **mobile app** (React Native) is in a separate repository: [pet-care-mobile-claude](https://github.com/ganoolmovie5th-cell/pet-care-mobile-claude)

## Features (MVP)

1. **Vet Marketplace** — browse, book, rate vets/clinics (owners on mobile, vet profile on web)
2. **Health Passport** — digital pet health records with vaccination reminders
3. **Playdate Community** — pet owner meetup matching and coordination
4. **Insurance Aggregator** — comparison links to pet insurance partners

## Project Structure

```
pet-care-claude/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── index.ts           # Server entry, middleware
│   │   ├── config/
│   │   │   ├── firebase.ts     # Firebase Admin SDK init
│   │   │   └── env.ts
│   │   ├── routes/
│   │   │   ├── auth.ts         # Phone OTP verification
│   │   │   ├── vets.ts         # Vet profile, availability
│   │   │   ├── bookings.ts     # Booking CRUD
│   │   │   ├── health.ts       # Pet health records
│   │   │   ├── playdate.ts     # Playdate posts & chat
│   │   │   └── payments.ts     # Xendit webhook
│   │   ├── services/           # Business logic
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT verification
│   │   ├── functions/          # Cloud Functions
│   │   ├── types/
│   │   └── utils/
│   ├── __tests__/              # Unit & integration tests
│   ├── firebase-config.json    # Firestore security rules
│   ├── package.json
│   └── .env.example
│
└── web/                        # React dashboard (vet-facing)
    ├── src/
    │   ├── App.tsx             # Router (Login/Dashboard)
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx    # Main layout
    │   │   ├── ClinicProfile.tsx
    │   │   ├── Calendar.tsx     # Slot management
    │   │   ├── BookingList.tsx
    │   │   └── Analytics.tsx
    │   ├── components/
    │   ├── services/            # Firebase & API calls
    │   ├── hooks/
    │   ├── styles/              # Theme & global CSS
    │   └── types/
    ├── __tests__/
    ├── vite.config.ts          # Dev server proxy to backend
    ├── package.json
    └── .env.example
```

## Setup

### Prerequisites

- **Node.js** v20+
- **Firebase Project** (CLI authenticated)
- **Xendit Account** (for payment testing)
- **Twilio Account** (for SMS notifications)

### Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Fill in: FIREBASE_ADMIN_SDK_PATH, XENDIT_API_KEY, TWILIO_ACCOUNT_SID/AUTH_TOKEN, PORT

# Start server
npm run dev        # Watch mode, port 5000
npm run build      # Production build
npm test           # Run tests
```

### Web Dashboard Setup

```bash
cd web
npm install

# Configure environment
cp .env.example .env
# Fill in: VITE_FIREBASE_CONFIG, VITE_API_BASE_URL=http://localhost:5000

# Start dev server
npm run dev        # Hot reload, port 3000
npm run build      # Production build
npm test           # Run tests
```

### Running Together

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Web Dashboard
cd web && npm run dev

# Dashboard accessible at http://localhost:3000
# Backend API at http://localhost:5000
```

## Architecture

| Layer | Tech | Role |
|-------|------|------|
| **Frontend (Mobile)** | React Native + Expo | Owner app (separate repo) |
| **Frontend (Web)** | React 19 + Vite | Vet dashboard |
| **Backend** | Node.js + Express | REST API, Cloud Functions |
| **Database** | Firebase Firestore | Structured data (users, pets, vets, bookings) |
| **Realtime** | Firebase Realtime DB | Chat, notifications |
| **Auth** | Firebase Auth | Phone OTP (owners), email (vets) |
| **Payments** | Xendit | E-wallet, bank transfer |
| **Notifications** | FCM + Twilio SMS | Push + SMS reminders |
| **Storage** | Firebase Cloud Storage | Pet photos, PDFs |

## Firestore Collections

```
users/{userId}
  - phone, name, email, avatar, subscription_status, created_at

vets/{vetId}
  - clinic_name, location, specialties, hours, rating, consultation_fee

pets/{petId}
  - ownerId, name, breed, age, photo, microchip

health_records/{recordId}
  - petId, type, date, note, next_due_date (for vaccinations)

bookings/{bookingId}
  - ownerId, petId, vetId, date, time, status, payment_status

playdate_posts/{postId}
  - ownerId, petId, location, date, description, interested_owners

reminders/{reminderId}
  - petId, type, due_date, status
```

## Development Workflow

1. **Feature branch** from `main`: `git checkout -b feature/vet-profile`
2. **Write failing test**: Unit or integration test for the feature
3. **Implement**: Minimal code to pass test
4. **Test & commit**: `npm test` then `git commit`
5. **Push & PR**: Request review, squash merge to `main`

## Testing

- **Unit tests** (Jest): Auth, services, utils
- **Integration tests** (Firebase Emulator): Database, Cloud Functions
- **E2E tests** (Cypress/Playwright): Full user flows (vet login → booking confirmation)

Run tests:
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm run test:coverage   # Coverage report
```

## Deployment

- **Backend**: Google Cloud Run (auto-scales, serverless)
- **Web Dashboard**: Firebase Hosting
- **Database/Auth**: Firebase managed services
- **Storage**: Firebase Cloud Storage

Deploy commands TBD after MVP launch.

## Documentation

- **Design Spec**: `docs/superpowers/specs/2026-07-22-pet-care-community-design.md`
- **Implementation Plan**: `docs/superpowers/plans/2026-07-22-pet-care-community-implementation.md`
- **Agent Coordination**: `AGENTS.md` (for Subagent-Driven execution)
- **IDE Configuration**: `CLAUDE.md` (for Claude Code IDE)

## Security & Compliance

- Phone OTP auth (6-digit, 10-min expiry)
- JWT sessions (7-day + refresh)
- Firestore security rules (owner isolation, role-based access)
- Xendit payment gateway (PCI-DSS)
- PDP compliance (privacy policy, user consent)
- No password storage

## Support & Feedback

Issues & feedback tracked in GitHub Issues. Daily feedback loop during MVP iteration.

---

**Next Steps:** Run backend + web dashboard locally, verify auth flow works end-to-end.
