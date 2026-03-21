# 🛠️ MatchCast Development Plan (aligned with PRD v8)

---

## Phase 1 — Data Pipeline + Basic Analysis

> **Goal:** `matchId → fetch stats → preprocess → LLM → return text`

### 1.0 Repo & Environment Bootstrap ✅
- [x] Initialize Git repository, add `.gitignore` (node_modules, .env, dist)
- [x] Create `.env.example` documenting all required env vars (no secrets committed)
- [x] Create monorepo root with `backend/` and `frontend/` directories

### 1.1 Backend Setup ✅
- [x] Initialize Node.js + TypeScript project (`backend/`)
- [x] Setup Express server with CORS
- [x] Create folder structure per PRD §6
- [x] Setup environment variables — central `config.ts` with fail-fast on missing vars
- [x] Install `pino` + `pino-http` and initialise shared logger in `utils/logger.ts`
- [x] Attach `pino-http` middleware to Express for automatic request/response logging

### 1.1a Error Middleware
- [x] Create `src/errors/AppError.ts` — base error class (`statusCode`, `message`)
- [x] Add subclasses: `ValidationError` (400), `NotFoundError` (404), `ExternalApiError` (502)
- [x] Update global error handler in `app.ts` to switch on error type

### 1.2 Input Validation Layer (Zod) ✅
- [x] Install `zod`
- [x] Create `validation/schemas.ts` — `MatchesQuerySchema` and `AnalysisParamsSchema` with inferred types
- [x] Create `middleware/validationMiddleware.ts` — `validateRequest(schema, source)` middleware
- [x] Apply validation middleware to routes (done when routes are built in §1.3+)

### 1.3 Football API Integration ✅
- [x] Register for api-sports.io API key (free tier — 100 req/day, 10 req/min)
- [x] Implement `services/footballApi.service.ts` — fetch finished EPL matches (season 2024, status=FT)
- [x] Implement `routes/matches.router.ts` + `controllers/matches.controller.ts`
- [x] Implement `GET /api/matches` — sorted by date desc, supports `?limit=` and `?offset=` params, returns `hasMore`
- [x] Handle API errors (`ExternalApiError` on non-2xx or error body)

### 1.4 Data Preprocessor ✅
- [x] Implement `services/preprocessor.ts` — raw match data → structured signals
- [x] Extract: possession, shot efficiency, xG, corners, fouls, pass accuracy, goalkeeper saves
- [x] Extract: goals (scorer, assist, type, minute), cards (player, type, minute)
- [x] Calculate derived signals: result, secondHalfGoals, lateGoals (80'+), wasComeback, xGDelta
- [x] Verified output against real fixture (Man Utd vs Fulham, fixture 1208021)

### 1.5 Analysis Generation (Text Only) ✅
- [x] Implement `services/analysisGenerator.ts`
- [x] Build system prompt (pundit persona, Sky Sports tone, prose only)
- [x] Build user prompt template with preprocessed signals
- [x] Call OpenAI Chat Completions API (gpt-4o — better stat coverage than gpt-4o-mini)
- [x] Update `GET /api/analysis/:matchId` — returns fixtureId, teams, score, analysis text
- [x] Tested on real fixture — output quality verified

### 1.6 Frontend Setup ✅
- [x] Create React + TypeScript app with Vite (`frontend/`)
- [x] Build `MatchCard` component (team logos, score, HT score, date)
- [x] Build `MatchList` component (LiveScore-style feed)
- [x] Fetch and display matches from `GET /api/matches` via TanStack Query

### 1.7 UI Integration (Text Only) ✅
- [x] Add `MatchCast` button to each `MatchCard`
- [x] Build `useAnalysis` hook with TanStack Query (fetch, loading, error states)
- [x] Display analysis transcript on button click (`AnalysisPanel`)
- [x] Button disabled while request is in flight
- [x] Dark theme — black/orange/white, livescore-inspired, CSS custom properties

**✅ Checkpoint:** Can click any match → see AI-generated pundit analysis text.

---

## Phase 2 — Audio Generation

> **Goal:** `matchId → fetch → preprocess → LLM → TTS → return text + audio`

### 2.1 TTS Integration ✅
- [x] Choose TTS provider — ElevenLabs (eleven_multilingual_v2, Antoni voice)
- [x] Implement `ttsService.ts` — text → base64 MP3 via ElevenLabs SDK
- [x] Handle TTS errors gracefully (return `audioBase64: null`)

### 2.2 Backend Response Update ✅
- [x] Updated `GET /api/analysis/:matchId` returns `audioBase64: string | null`
- [x] TTS failure falls back gracefully — text still returned
- [x] Cache stores audio alongside analysis — ElevenLabs never called twice

### 2.3 Frontend Audio Player ✅
- [x] Build `AudioPlayer` component — play/pause, progress bar, time display
- [x] Convert base64 → blob → object URL; fix StrictMode URL revocation bug
- [x] Auto-play when audio loads via `onLoadedMetadata`
- [x] Update `AnalysisPanel` to render `AudioPlayer` + collapsible transcript (Eye/EyeOff icon)
- [x] Text-only fallback when `audioBase64` is null
- [x] Update `Analysis` type to include `audioBase64`
- [x] MatchCast button becomes toggle (outlined) after analysis generated
- [x] Panel auto-collapses when audio finishes to keep list clean
- [x] Matches grouped by date with en-AU date headers
- [x] Load more matches with `useInfiniteQuery` + offset pagination
- [x] Initial load and "load more" show Loader2 spinner

**✅ Checkpoint:** Click match → hear a pundit-style audio analysis.

---

## Phase 3 — Caching Layer

> **Goal:** Generate once per match, serve from cache forever after.

### 3.1 Cache Interface
- [x] Define `CacheInterface` (abstract — Open-Closed Principle):
  ```typescript
  interface CacheProvider {
    get(matchId: string): Promise<CachedAnalysis | null>;
    set(matchId: string, data: CachedAnalysis): Promise<void>;
  }
  ```
- [x] Implement `MemoryCache` (in-memory Map)

### 3.2 Integrate Cache into Pipeline
- [x] Check cache BEFORE football API / LLM / TTS calls
- [x] On cache hit: return immediately with `cached: true`
- [x] On cache miss: run full pipeline → store result → return with `cached: false`
- [x] Deduplicate concurrent requests for the same matchId (avoid parallel LLM calls)

### 3.3 Verify Cache Behaviour
- [x] First request: generates fresh (slow)
- [x] Second request: returns cached (instant)
- [x] Different matchId: generates fresh

**✅ Checkpoint:** Second click on same match returns instantly. No duplicate LLM/TTS spend.

---

## Phase 4 — Security & Rate Limiting

> **Goal:** Production-grade security layer — protected routes, rate limiting, auth tokens.

### 4.1 Rate Limiting ✅
- [x] Install `express-rate-limit`
- [x] Apply global rate limit (30 req/15min per IP) — all routes
- [x] Apply stricter limit on `/api/analysis` (10 req/15min per IP — expensive pipeline)

### 4.2 Security Headers ✅
- [x] Install `helmet` — sets secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
- [x] Mount `helmet()` as first middleware in `app.ts`
- [x] Rename `/health` → `/api/health` for route consistency

### 4.3 JWT Auth — Anonymous Session (Access + Refresh Token) ✅
> No user login/logout — app auto-generates a guest session on load. Protects API from external abuse.

**Backend:**
- [x] Install `jsonwebtoken` + `cookie-parser`
- [x] Add `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN` to `config.ts` + `.env.example`
- [x] Implement `POST /api/auth/token` — issues accessToken (15min) in JSON + refreshToken (7d) in HTTP-only cookie
- [x] Implement `POST /api/auth/refresh` — validates HTTP-only cookie → issues new accessToken
- [x] Create `middleware/authMiddleware.ts` — verifies Bearer accessToken, rejects with 401 if invalid/missing
- [x] Protect `/api/matches` and `/api/analysis` behind `authMiddleware`
- [x] `/api/auth/*` and `/api/health` remain public
- [x] Tighten CORS — credentials: true, explicit origin from config

**Frontend:**
- [x] Create `src/lib/auth.ts` — fetches token on init, handles refresh on 401, exposes `getAccessToken()`
- [x] Update `apiFetch` in `matchcast.api.ts` — attaches `Authorization: Bearer <token>` to all protected requests
- [x] On 401 response → call refresh → retry original request once
- [x] `initAuth()` called before React renders in `main.tsx`

**✅ Checkpoint:** Routes protected, tokens short-lived, refresh token never exposed to JS.

---

## Phase 5 — Polish & Deploy

> **Goal:** Production-ready MVP with live URL.

### 5.1 Frontend Polish
- [ ] Mobile-responsive match cards
- [ ] Error state UI ("Analysis unavailable, try again") — already partial, verify coverage
- [ ] Empty state (no matches available)
- [ ] Update frontend to send Authorization header with access token on analysis requests

### 5.2 Backend Hardening
- [ ] Request timeout handling (30s max for full pipeline — LLM + TTS can be slow)
- [ ] Ensure key pipeline events are logged via Pino: matchId, cache hit/miss, LLM latency, TTS latency
- [ ] Use `pino-pretty` in dev, plain JSON in production (env-based)
- [ ] Tighten CORS — allow only the Vercel frontend domain in production

### 5.3 Deployment
- [ ] Push repo to GitHub (if not already)
- [ ] Deploy backend to Railway — set all env vars
- [ ] Deploy frontend to Vercel — set `VITE_API_BASE_URL` to Railway backend URL
- [ ] Verify CORS between Vercel and Railway domains
- [ ] Smoke test: end-to-end flow on 3 different matches (text + audio)

### 5.4 Submission Prep
- [ ] Write README — what it is, architecture decisions, AI integration rationale, future enhancements (Redis, S3, multi-agent)
- [ ] Clean up Git history
- [ ] Export AI conversation logs
- [ ] Verify live URL works
- [ ] Submit to Patrick.Phelan@Visory.com.au

**✅ Checkpoint:** Live URL works. Code is clean. README tells the story.

---

## Time Estimates

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 1 — Data Pipeline + Analysis | 5–6 hours | 5–6 hours |
| Phase 2 — Audio Generation | 2–3 hours | 7–9 hours |
| Phase 3 — Caching Layer | 1–2 hours | 8–11 hours |
| Phase 4 — Security & Rate Limiting | 2–3 hours | 10–14 hours |
| Phase 5 — Polish & Deploy | 2–3 hours | 12–17 hours |
| **Total** | **12–17 hours** | ~2 days |

---

## Development Rules

- Complete and test each phase before moving to the next
- Commit at each checkpoint with a descriptive message
- Keep scope minimal — one well-executed feature > ten half-finished ideas
- Iterate on the prompt using real match data, not hypotheticals
- If stuck on a phase for > 1 hour, simplify and move on
- Use AI tools throughout and save conversation logs — they're a submission deliverable
