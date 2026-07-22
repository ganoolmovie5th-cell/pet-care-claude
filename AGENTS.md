# AGENTS.md

Panduan koordinasi untuk subagent-driven execution of Pet Care Community MVP.

## Model Eksekusi: Subagent-Driven

Setiap task dijalankan oleh fresh subagent, diikuti review checkpoint.

**Alur:**
1. Main agent dispatch subagent dengan task number + detailed requirements
2. Subagent execute task steps (write code → test → commit)
3. Subagent deliver output (files created, tests passing, commit hash)
4. Main agent review checkpoint: code quality, test coverage, integration
5. Main agent approve atau request revisions
6. Main agent dispatch next task

**Keuntungan:**
- Fresh context per task (no context bloat)
- Parallel execution potential (multiple subagents concurrently)
- Clear checkpoints (no silent failures)
- Modular delivery (each task stands alone)

## Task Breakdown

**Phase 1: Project Setup & Auth (Tasks 1-4)**

### Task 1: Mobile Project Initialization
**Files:** 
- Create: `src/App.tsx`, `package.json`, `tsconfig.json`, `app.json`, `.env.example`
- Result: Runnable Expo app with NavigationContainer

**Steps:**
- [ ] Run `npm create-expo-app pet-care-mobile`
- [ ] Install dependencies: `react-navigation`, `firebase`, `axios`, `date-fns`, `@react-native-async-storage/async-storage`
- [ ] Configure `tsconfig.json` for React Native + JSX
- [ ] Create `app.json` Expo config with app name, splash, icon, plugins (camera, notifications)
- [ ] Create `App.tsx` with NavigationContainer + AuthStack
- [ ] Create `.env.example` with Firebase keys and API_URL
- [ ] Run `npm run web` to verify app starts
- [ ] Commit: `feat: mobile project initialization`

---

### Task 2: Backend Project Initialization
**Files:**
- Create: `backend/src/index.ts`, `package.json`, `tsconfig.json`, `.env.example`, `src/config/firebase.ts`
- Result: Express server running on localhost:5000

**Steps:**
- [ ] Create `backend/` directory with Node.js project structure
- [ ] Install dependencies: `express`, `firebase-admin`, `cors`, `dotenv`, `nodemon`, `jest`
- [ ] Configure `tsconfig.json` for Node.js
- [ ] Create `src/config/firebase.ts`: Initialize Firebase Admin SDK with service account
- [ ] Create `src/index.ts`: Express app with CORS, JSON middleware, health check endpoint (`GET /health`), global error handler
- [ ] Create `.env.example` with Firebase paths and API keys
- [ ] Add scripts to `package.json`: `dev` (nodemon), `build`, `test`
- [ ] Run `npm run dev` to verify server starts on port 5000
- [ ] Commit: `feat: backend project initialization`

---

### Task 3: Web Dashboard Project Initialization
**Files:**
- Create: `web/src/App.tsx`, `src/pages/Login.tsx`, `vite.config.ts`, `package.json`, `.env.example`, `src/styles/theme.css`
- Result: Vite dev server on localhost:3000 with proxy to backend

**Steps:**
- [ ] Create `web/` directory with React + Vite template
- [ ] Install dependencies: `react`, `react-router-dom`, `firebase`, `vite-plugin-react`
- [ ] Create `vite.config.ts`: Configure React plugin + dev server on 3000 with `/api` proxy to `localhost:5000`
- [ ] Create `src/App.tsx`: Router with Login and Dashboard routes
- [ ] Create `src/pages/Login.tsx`: Placeholder login form (TBD)
- [ ] Create `src/styles/theme.css`: Brand colors, fonts (orange #FF6B35 accent)
- [ ] Create `.env.example` with VITE_API_BASE_URL
- [ ] Run `npm run dev` to verify dev server starts
- [ ] Commit: `feat: web dashboard project initialization`

---

### Task 4: Firebase Phone OTP Auth (Mobile + Backend)
**Files (Mobile):**
- Create: `src/services/firebase.ts`, `src/services/auth.ts`, `src/context/AuthContext.tsx`, `src/screens/auth/PhoneScreen.tsx`, `src/screens/auth/OTPScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (conditional auth stack), `App.tsx` (wrap with AuthProvider)

**Files (Backend):**
- Create: `src/routes/auth.ts`, `src/config/firebase.ts` (Firebase Admin init), `__tests__/auth.test.ts`
- Modify: `src/index.ts` (mount auth routes)

**Steps (Mobile):**
- [ ] Create `src/services/firebase.ts`: Initialize Firebase with AsyncStorage persistence
- [ ] Create `src/services/auth.ts`: `sendPhoneOTP()`, `verifyOTP()`, `getCurrentUser()`, `logout()`, `getIdToken()`
- [ ] Create `src/context/AuthContext.tsx`: AuthProvider with user state, loading, error, onAuthStateChanged listener
- [ ] Create `src/screens/auth/PhoneScreen.tsx`: Phone input (+62 validation), send OTP button
- [ ] Create `src/screens/auth/OTPScreen.tsx`: 6-digit OTP input, verify button
- [ ] Modify `src/navigation/RootNavigator.tsx`: Conditionally render AuthStack (phone/OTP) or main tabs based on user auth state
- [ ] Test: `npm run web` → enter phone → receive OTP → verify → navigate to dashboard (50% complete)
- [ ] Commit: `feat: mobile phone OTP auth with Firebase`

**Steps (Backend):**
- [ ] Create `src/routes/auth.ts`: `POST /auth/verify-token` endpoint
  - Input: `idToken` (Firebase ID token from mobile)
  - Verify token with Firebase Admin SDK
  - Generate JWT (7-day expiry, include userId)
  - Return: `{ token, expiresIn, refreshToken }`
  - Error handling: 400 (missing token), 401 (invalid token)
- [ ] Create `src/middleware/auth.ts`: JWT verification middleware
  - Extract token from `Authorization: Bearer <token>`
  - Verify JWT signature
  - Set `req.userId` for downstream routes
- [ ] Modify `src/index.ts`: Mount `auth.ts` routes, apply auth middleware to protected routes
- [ ] Create `__tests__/auth.test.ts`: Unit tests for `/verify-token` endpoint (missing token, invalid token, valid token)
- [ ] Run `npm test` to verify tests pass
- [ ] Commit: `feat: backend phone OTP auth with Firebase and JWT`

---

**Gate Checkpoint (after Task 4):**
- [ ] Mobile app: Phone → OTP → Dashboard screens render without crash
- [ ] Backend: `POST /auth/verify-token` returns valid JWT for valid Firebase ID token
- [ ] Integration: Mobile OTP → backend JWT exchange works end-to-end
- [ ] Tests: All auth tests passing
- [ ] No console errors in mobile or backend logs

---

**Phase 2: Vet Marketplace (Tasks 5-20)**
**TBD after Phase 1 checkpoint**

---

**Phase 3: Health Passport (Tasks 21-35)**
**TBD after Phase 2 checkpoint**

---

**Phase 4: Playdate Community (Tasks 36-50)**
**TBD after Phase 3 checkpoint**

---

**Phase 5: Polish & Integration (Tasks 51-60)**
**TBD after Phase 4 checkpoint**

---

## Subagent Dispatch Template

**For each task, main agent sends:**

```
TASK [number]: [Task Name]

**Context:** [Brief background]
**Goal:** [What should be delivered]
**Files:** [Create/Modify list]

**Requirements:**
- [Specific requirement 1]
- [Specific requirement 2]
- [Etc.]

**Integration points:**
- Previous task: [Task X] output → this task input
- Next task: [Task Y] depends on this task → [specific files/exports]

**Success criteria:**
- [ ] All files created/modified per spec
- [ ] All tests passing
- [ ] No console warnings/errors
- [ ] Commit message: `feat: [description]`

**Code examples (if needed):**
[Paste relevant snippets from implementation plan]

**Execute:**
1. Read implementation plan task details
2. Implement step-by-step
3. Test locally
4. Commit
5. Report completion with file paths and commit hash
```

---

## Review Checklist

**Main agent reviews every subagent delivery:**

1. **Files created/modified:** Match spec exactly? Missing files?
2. **Code quality:** ESLint clean? Types correct? Self-documenting?
3. **Tests:** Passing? Adequate coverage (80%+)?
4. **Integration:** Connects to previous/next tasks properly?
5. **Performance:** No N+1 queries, async handled correctly?
6. **Security:** No secrets in code? Auth checks in place?
7. **Commits:** Message follows convention? Co-authored by Claude?

---

## Communication During Execution

**Subagent reports:** "Task X complete. Files: [list]. Tests: [pass/fail]. Commit: [hash]."

**Main agent response:** "Approved" OR "Requested changes: [list]"

**If revisions needed:** Subagent fixes and re-commits (new commit, not amend).

---

## Parallel Execution (Optional)

Once Phase 1 (Tasks 1-4) complete and stable:
- Task 5 (subagent A) + Task 21 (subagent B) can run concurrently (different files)
- Task 5 (A) and Task 6 (B) should NOT run concurrently (sequential dependency)
- Main agent coordinates task graph, manages concurrency limits

---

## Troubleshooting

**Subagent stuck on task:**
- Main agent: Review task requirements, provide code hints, or split task into smaller steps
- Escalate: If architectural blocker, pause execution, return to main agent for design clarification

**Test failures in subagent execution:**
- Subagent: Debug locally, check Firebase Emulator logs, review error output
- Main agent: If root cause unclear, provide error analysis

**Integration issues between tasks:**
- Main agent: Verify file exports, type signatures match
- Subagent: Adjust implementation to match upstream task output

---

## Timeline & Velocity

**Target:** 1-2 tasks per day (some tasks shorter, some longer)

**Phase 1:** 1 day (Tasks 1-4 can be fast with templates)
**Phase 2:** 3 days (Vet marketplace more complex)
**Phase 3:** 2 days (Health passport simpler)
**Phase 4:** 2 days (Playdate community with chat)
**Phase 5:** 1 day (Polish, bug fixes)

**Contingency:** 1 day buffer for blockers

---

## Git Workflow

**Main branch:** Always stable, all tests passing
**Feature branches:** One per task (e.g., `feat/mobile-auth`, `feat/vet-browse`)
**Commits:** Frequent per task step (see CLAUDE.md)
**Squash merge:** At task completion (keep history clean)

---

Next: Dispatch Subagent for Task 1 (Mobile Project Initialization).
