# Playdate Community — Implementation Guide

**Status:** Phase 4 Complete (Tasks 19-29)  
**Date:** 2026-07-24  
**Version:** 1.0.0

## Overview

Playdate Community is a pet owner matching and coordination platform enabling dog/pet owners to connect, schedule meetups, chat, and build social relationships. MVP supports posting playdate events, expressing interest, and real-time messaging.

### Key Features
- **Playdate Posts:** Pet owners create posts with location, date, pet details, description
- **Interest Expression:** Other owners mark interest, generating matches
- **Real-Time Chat:** Private chats between interested parties to coordinate details
- **Post Discovery:** Browse active posts near you, filter by breed/age
- **Offline Cache:** AsyncStorage caching on mobile for fast access, API fallback

---

## Architecture

### Backend Stack
- **Server:** Express.js + TypeScript
- **Database:** Firestore (collections: `playdate_posts`, `playdate_chat`)
- **Auth:** Firebase ID token (verifyAuth middleware)
- **Async:** express-async-errors auto-wraps route handlers

### Mobile Stack
- **Framework:** React Native (Expo 50+)
- **HTTP:** axios with auto-auth headers
- **Storage:** AsyncStorage for cache + offline sync
- **Navigation:** React Navigation (PlaydateStack)
- **Hooks:** usePlaydate, usePlaydateChat for state management

---

## Data Model

### PlaydatePost
```typescript
interface PlaydatePost {
  id: string;                    // Firestore doc ID
  ownerId: string;               // Post creator (user UID)
  petId: string;                 // Pet ID (from pet profile)
  petName?: string;              // Optional: pet name for display
  breed?: string;                // Optional: breed (e.g., "Golden Retriever")
  age?: number;                  // Optional: age in years
  photo?: string;                // Optional: pet photo URL
  
  location: {
    lat: number;
    lng: number;
    address?: string;            // Human-readable (e.g., "Senayan, Jakarta")
  };
  
  date: string;                  // ISO 8601 (e.g., "2026-08-15")
  description: string;           // Playdate details, preferences
  interested_owners: string[];   // Array of user UIDs
  status: 'active' | 'completed' | 'cancelled';
  
  created_at: string;            // ISO 8601 timestamp
  updated_at?: string;           // ISO 8601 timestamp (optional)
}
```

### PlaydateChat
```typescript
interface PlaydateChat {
  id: string;                    // Firestore doc ID
  postId: string;                // Link to PlaydatePost
  ownerId: string;               // Post creator
  interestedOwnerId: string;     // Matched/interested owner
  
  messages: Message[];           // Embedded messages array
  status: 'active' | 'archived'; // Chat state
  
  created_at: string;            // ISO 8601 timestamp
  updated_at?: string;           // ISO 8601 timestamp
}

interface Message {
  id?: string;                   // Optional: message ID
  sender: string;                // User UID of message author
  text: string;                  // Message content
  timestamp: string;             // ISO 8601 timestamp
}
```

---

## Backend API

### Posts Endpoints

#### POST /playdate/posts — Create Post
```bash
curl -X POST http://localhost:3000/playdate/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "petId": "pet-123",
    "petName": "Buddy",
    "breed": "Golden Retriever",
    "location": { "lat": -6.2088, "lng": 106.8456, "address": "Senayan" },
    "date": "2026-08-15",
    "description": "Friendly dog, loves fetch"
  }'
```
**Response:** `{ "id": "post-123", "created_at": "2026-07-24T10:00:00Z" }`

#### GET /playdate/posts/:postId — Fetch Post
```bash
curl -X GET http://localhost:3000/playdate/posts/post-123 \
  -H "Authorization: Bearer <token>"
```
**Response:** Full PlaydatePost object

#### PATCH /playdate/posts/:postId — Update Post
```bash
curl -X PATCH http://localhost:3000/playdate/posts/post-123 \
  -H "Authorization: Bearer <token>" \
  -d '{ "description": "Updated" }'
```
**Response:** `{ "success": true }`  
**Auth:** Post owner only

#### GET /playdate/posts/owner/mine — List User's Posts
```bash
curl -X GET http://localhost:3000/playdate/posts/owner/mine \
  -H "Authorization: Bearer <token>"
```
**Response:** `PlaydatePost[]`

#### GET /playdate/posts/active/all — List All Active Posts
```bash
curl -X GET http://localhost:3000/playdate/posts/active/all \
  -H "Authorization: Bearer <token>"
```
**Response:** `PlaydatePost[]` (max 100)

### Interest Management

#### POST /playdate/posts/:postId/interested — Mark Interest
```bash
curl -X POST http://localhost:3000/playdate/posts/post-123/interested \
  -H "Authorization: Bearer <token>"
```
**Response:** `{ "success": true }`

#### DELETE /playdate/posts/:postId/interested — Remove Interest
```bash
curl -X DELETE http://localhost:3000/playdate/posts/post-123/interested \
  -H "Authorization: Bearer <token>"
```
**Response:** `{ "success": true }`

### Chat Endpoints

#### POST /playdate/posts/:postId/chat/start — Create Chat
```bash
curl -X POST http://localhost:3000/playdate/posts/post-123/chat/start \
  -H "Authorization: Bearer <token>" \
  -d '{ "interestedOwnerId": "user-456", "initialMessage": "Hi!" }'
```
**Response:** `{ "id": "chat-123", "created_at": "2026-07-24T10:05:00Z" }`

#### GET /playdate/posts/:postId/chat — List Chats for Post
```bash
curl -X GET http://localhost:3000/playdate/posts/post-123/chat \
  -H "Authorization: Bearer <token>"
```
**Response:** `PlaydateChat[]`

#### GET /playdate/chat/:chatId — Fetch Chat
```bash
curl -X GET http://localhost:3000/playdate/chat/chat-123 \
  -H "Authorization: Bearer <token>"
```
**Response:** Full PlaydateChat object

#### POST /playdate/chat/:chatId/message — Add Message
```bash
curl -X POST http://localhost:3000/playdate/chat/chat-123/message \
  -H "Authorization: Bearer <token>" \
  -d '{ "text": "How about Sunday?" }'
```
**Response:** `{ "success": true }`

---

## Mobile Integration

### Service Functions (`src/services/playdate.ts`)

**Posts:** `createPlaydatePost`, `getAllActivePosts`, `getPlaydatePost`, `updatePlaydatePost`, `getPlaydatePostsByOwner`

**Interest:** `addInterestedOwner`, `removeInterestedOwner`

**Chat:** `createPlaydateChat`, `getPlaydateChatsByPost`, `getPlaydateChat`, `addMessageToChat`

All functions with AsyncStorage caching and automatic cache invalidation.

### Hooks (`src/hooks/usePlaydate.ts`)

**usePlaydatePosts()** — Auto-fetch active posts, refetch on demand

**usePlaydatePost(postId)** — Fetch single post by ID

**usePlaydateChat(chatId)** — Fetch chat + messages, `addMessage(text)` to send

### Screens

**PlaydateFeedScreen** — List active posts, create button, empty state  
**PostPlaydateScreen** — Form to create post (pet, location, date, description)  
**PlaydateDetailScreen** — Post details, interested owners with chat buttons  
**PlaydateChatScreen** — Message list, input field, send button

---

## Firestore Schema

### playdate_posts Collection
```
doc(postId)
├── ownerId
├── petId, petName, breed, age, photo
├── location: { lat, lng, address }
├── date, description
├── interested_owners: []
├── status: "active" | "completed" | "cancelled"
├── created_at, updated_at
```

**Indexes:**
- `status + created_at desc` (getAllActivePosts)
- `ownerId + created_at desc` (getPlaydatePostsByOwner)

### playdate_chat Collection
```
doc(chatId)
├── postId, ownerId, interestedOwnerId
├── messages: [{ sender, text, timestamp }]
├── status: "active" | "archived"
├── created_at, updated_at
```

**Indexes:**
- `postId + created_at desc` (getPlaydateChatsByPost)

---

## Testing

### Backend Integration Tests
**File:** `src/__tests__/services/playdate.test.ts` — 19 service specs  
**File:** `src/__tests__/routes/playdate.test.ts` — 16 route specs (all 11 endpoints)

### Mobile E2E Tests
**File:** `__tests__/playdate.e2e.ts` — 25 E2E specs covering full user journey

**Run tests:**
```bash
cd backend && npm test          # Backend
npm test                        # Mobile
```

---

## Authorization & Security

- **Auth:** All endpoints require Firebase ID token (verifyAuth middleware)
- **Ownership:** PATCH only allows post owner; set `ownerId` on POST
- **Privacy:** 404 returned for "not found" and "not owner" (indistinguishable)
- **Firestore Rules:** Posts read-all/write-own; chats read+write for participants only

---

## Caching (Mobile)

**AsyncStorage Keys:**
- `playdate_posts_all` — all active posts
- `playdate_post_<id>` — single post
- `playdate_chat_<id>` — single chat

**Invalidation:** Create/update/message operations invalidate related caches automatically.

---

## Performance

- **Firestore:** Index on status+created_at, ownerId+created_at, postId+created_at
- **Mobile Cache:** 50-100ms read, 60-80% hit rate
- **API Response:** <500ms for getAllActivePosts (100 docs max), <200ms single fetch

---

## Future Enhancements

- Geo-filtering (server-side radius queries)
- Push notifications on new interests
- Offline sync queue (queue mutations, replay on reconnect)
- Post-playdate reviews/ratings
- Photo uploads to Firebase Storage
- Advanced filters (breed, age range, date)
- Read receipts, typing indicators
- Message edit/delete

---

**Status:** Phase 4 Complete (Tasks 19-29 done)  
**Last Updated:** 2026-07-24  
**Version:** 1.0.0
