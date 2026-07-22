# CLAUDE.md

Panduan untuk Claude dan asisten berbasis Claude yang mengerjakan repository ini.

Baca [`AGENTS.md`](AGENTS.md) terlebih dahulu untuk konteks subagent-driven execution.

## Ringkas Cepat

- **Proyek:** Pet Care Community MVP — marketplace pet care Indonesia
- **Scope:** Backend API (Node.js/Express/Firebase) + Web Dashboard (React/Vite)
- **Timeline:** 5-6 minggu solo development
- **Target:** 10K owner + 100 vet Jakarta, 5% conversion rate
- **Teknologi:** React 19, TypeScript, Firebase (Firestore/Auth/Cloud Functions), Xendit, Twilio

## Struktur Repo

```
backend/          Node.js Express server, Firebase Cloud Functions
web/              React Vite dashboard (vet-facing)
docs/
  ├── superpowers/specs/    Design specification
  └── superpowers/plans/    Implementation plan (Tasks 1-60+)
```

## Konvensi

### Code Style
- **TypeScript** — strict mode (`tsconfig.json`)
- **Prettier** — auto-format on save
- **ESLint** — enforce rules before commit
- **Jest** — test framework (TDD: test-first, minimal implementation)
- **No comments** — self-documenting code; only WHY, not WHAT

### Naming
- **Files:** kebab-case (`vet-service.ts`, `booking-form.tsx`)
- **Functions/Variables:** camelCase (`getUserById`, `isBookingConfirmed`)
- **Types/Interfaces:** PascalCase (`SportEvent`, `BookingPayload`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)

### Commits
- **Frequent:** Commit per task step
- **Format:** `feat: add booking confirmation`, `fix: handle offline sync`, `test: auth flow`
- **Co-author:** All commits include Claude co-authorship line

### Testing
- **Unit tests:** 80%+ coverage on services
- **Integration tests:** Firebase Emulator for database/auth flows
- **No mocks** — hit real Firebase in integration tests
- **Test file location:** `__tests__/` mirroring `src/` structure

## Before Starting Work

1. Read design spec: `docs/superpowers/specs/2026-07-22-pet-care-community-design.md`
2. Read implementation plan: `docs/superpowers/plans/2026-07-22-pet-care-community-implementation.md`
3. Understand task dependencies and file boundaries
4. Check existing code patterns in `backend/src/` or `web/src/`

## During Development

### Backend Tasks
- All routes in `src/routes/` (auth, vets, bookings, health, playdate, payments)
- All services in `src/services/` (business logic separate from routes)
- Firebase config in `src/config/firebase.ts` (initialized once)
- Middleware in `src/middleware/auth.ts` (JWT verification)
- Cloud Functions in `src/functions/` (async jobs: bookings, reminders, webhooks)

### Web Dashboard Tasks
- Pages in `src/pages/` (full-page components: Login, Dashboard, Calendar, etc.)
- Components in `src/components/` (reusable UI blocks)
- Services in `src/services/` (Firebase calls, API requests)
- Hooks in `src/hooks/` (state logic: useAuth, useVet, etc.)
- Types in `src/types/` (TypeScript interfaces)
- Styles in `src/styles/` (theme.css, global.css)

### Local Development
```bash
# Terminal 1: Backend
cd backend && npm run dev       # nodemon watches changes, port 5000

# Terminal 2: Web
cd web && npm run dev           # Vite HMR, port 3000

# Terminal 3: Test suite (optional)
cd backend && npm test -- --watch
```

### Before Committing
```bash
npm run lint        # ESLint
npm run format      # Prettier
npm test            # Jest
git diff --check    # Trailing whitespace
```

## Firestore Data Model

**Collections (read design spec for full schema):**

```
users/{userId}
  ├── phone, name, email, avatar
  ├── subscription_status (free/premium)
  └── created_at

vets/{vetId}
  ├── clinic_name, location (lat/lng)
  ├── specialties[], hours
  ├── rating, review_count
  └── consultation_fee

pets/{petId}
  ├── ownerId, name, breed, age, photo
  └── microchip (optional)

bookings/{bookingId}
  ├── ownerId, petId, vetId
  ├── date, time, status (pending/confirmed/completed/cancelled)
  └── payment_status (pending/paid/refunded)

health_records/{recordId}
  ├── petId, type (vaksin/checkup/medication/surgery)
  ├── date, note, vet_name
  └── next_due_date (for vaccinations)

playdate_posts/{postId}
  ├── ownerId, petId, location (lat/lng)
  ├── date, description, status (active/completed/cancelled)
  └── interested_owners[]

reminders/{reminderId}
  ├── petId, type, due_date
  └── status (pending/sent/acknowledged)
```

## Security Rules

**Firestore rules** in `backend/firebase-config.json`:
- `users/{userId}` — only owner can read/write
- `vets/{vetId}` — public read, vet can write own profile
- `bookings/{bookingId}` — owner/vet can read, owner creates (payment flow)
- `health_records/{recordId}` — only owner can read/write
- `playdate_posts/{postId}` — owner can read/write, others can read
- No anonymous access

## Authentication

**Phone OTP (Owners):**
1. User enters +62-based phone number
2. Firebase Auth sends 6-digit OTP via SMS
3. User enters OTP, gets Firebase ID token
4. Backend `/auth/verify-token` exchanges ID token for JWT (7-day + refresh)
5. Frontend stores JWT in localStorage, includes in all API requests

**Email (Vets):**
TBD post-MVP — placeholder for web dashboard login

## Payment Flow

1. Owner books appointment, submits payment
2. Frontend calls Xendit widget (e-wallet, bank transfer)
3. Xendit redirects to backend webhook `/payments/xendit-webhook`
4. Backend updates `booking.payment_status = paid`, holds funds in escrow
5. Post-visit (vet confirms), funds released to vet account

## Deployment Checklist

Before production:
- [ ] All tests passing (`npm test`)
- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Backend deployed to Cloud Run
- [ ] Web dashboard deployed to Firebase Hosting
- [ ] Environment variables set (API_KEY, XENDIT_KEY, TWILIO_KEY)
- [ ] SSL/TLS enabled (auto via Cloud Run + Hosting)
- [ ] Monitoring set up (Cloud Logging, Error Reporting)

## When Stuck

1. Check Firebase Firestore Emulator logs: `firebase emulators:start`
2. Check backend logs: `npm run dev` shows console.log output
3. Check web browser DevTools: Network tab for API errors
4. Run `npm test` for isolated failures
5. Grep for similar patterns in codebase: `grep -r "function_name" src/`

## Phase Gates

**Phase 1 (Tasks 1-4): Project Setup & Auth**
- Mobile/backend/web initialized
- Phone OTP auth working end-to-end
- Gate: Login screen → OTP verification → Dashboard (50% complete)

**Phase 2 (Tasks 5-20): Vet Marketplace**
- Vet browse/search, booking flow, payment
- Gate: Browse vet → book appointment → pay → confirmation email

**Phase 3 (Tasks 21-35): Health Passport**
- Pet profile, health records, vaccination reminders
- Gate: Add pet → record vaccination → reminder at due date

**Phase 4 (Tasks 36-50): Playdate Community**
- Post playdate, chat, matching algorithm
- Gate: Post pet → interested owner matches → chat → meetup

**Phase 5 (Tasks 51-60): Polish & Integration**
- Insurance links, analytics, error handling, performance
- Gate: All 4 features stable, 5+ bookings/day, NPS >30

## Next Steps

Start with Subagent-Driven execution: dispatch fresh subagent per task from implementation plan, review checkpoints after each task.

See `AGENTS.md` for execution model.
