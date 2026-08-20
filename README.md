# Pet Care Community

Platform marketplace menghubungkan pemilik hewan peliharaan Indonesia dengan dokter hewan, groomer, dan sesama pet owner. Repository ini berisi web vet dashboard dan Node.js/Firebase backend API.

**Tech Stack:** React · Vite · Node.js · Express · Firebase (Firestore, Auth, FCM) · Xendit · Twilio

**Mobile App:** [pet-care-mobile-claude](https://github.com/ganoolmovie5th-cell/pet-care-mobile-claude)

## Features

- Vet Marketplace (browse, book, rate vets/clinics)
- Health Passport (digital pet health records + vaccination reminders)
- Playdate Community (pet owner meetup matching + chat)
- Insurance Aggregator (comparison links)
- Phone OTP auth (Firebase)
- Payment (Xendit: e-wallet, bank transfer)
- Push notifications (FCM) + SMS reminders (Twilio)

## Getting Started

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev        # port 5000

# Web Dashboard
cd web
npm install
cp .env.example .env
npm run dev        # port 3000 (proxy ke backend)
```

## Project Structure

```
backend/
  src/
    index.ts            → Server entry, middleware
    config/             → Firebase Admin SDK, env
    routes/             → auth, vets, bookings, health, playdate, payments
    services/           → Business logic
    middleware/         → Firebase ID token verification
  __tests__/            → Unit & integration tests

web/
  src/
    App.tsx             → Router (Login/Dashboard)
    pages/              → Login, Dashboard, ClinicProfile, Calendar, BookingList, Analytics
    components/         → UI components
    services/           → Firebase & API calls
    hooks/              → Custom hooks
    styles/             → Theme & global CSS
```

## Testing

```bash
cd backend && npm test
cd web && npm test
```

## License

MIT
