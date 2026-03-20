# 🛠️ MatchCast Development Plan (aligned with PRD v8)

---

## Phase 1 — Data Pipeline + Basic Analysis

> **Goal:** `matchId → fetch stats → preprocess → LLM → return text`

### 1.0 Repo & Environment Bootstrap
- [ ] Initialize Git repository, add `.gitignore` (node_modules, .env, dist)
- [ ] Create `.env.example` documenting all required env vars (no secrets committed)
- [ ] Create monorepo root with `backend/` and `frontend/` directories

### 1.1 Backend Setup
- [ ] Initialize Node.js + TypeScript project (`backend/`)
- [ ] Setup Express server with CORS
- [ ] Create folder structure per PRD §6
- [ ] Setup environment variables (API keys for football API, Anthropic)
- [ ] Add basic error handling middleware
- [ ] Install `pino` + `pino-http` and initialise shared logger in `utils/logger.ts`
- [ ] Attach `pino-http` middleware to Express for automatic request/response logging

### 1.2 Input Validation Layer (Zod)
- [ ] Install `zod` (`npm install zod`)
- [ ] Create `validation/schemas.ts` — define Zod schemas for all route inputs:
  - `MatchesQuerySchema` — `limit`, `competition`, `dateFrom`, `dateTo`
  - `AnalysisParamsSchema` — `matchId` (numeric string, max 20 chars)
- [ ] Create `validation/middleware.ts` — generic `validateRequest(schema, source)` middleware
  - Calls `schema.safeParse(req[source])`
  - Returns `400` with `{ error, details: result.error.flatten() }` on failure
  - Replaces `req[source]` with parsed/coerced values on success
- [ ] Apply validation middleware to both routes before handler logic

### 1.3 Football API Integration
- [ ] Register for football-data.org API key (free tier)
- [ ] Implement `footballApi.ts` — fetch finished matches
- [ ] Implement `GET /matches` — return recent completed matches
- [ ] Handle API errors and rate limiting (free tier: 10 req/min)

### 1.4 Data Preprocessor
- [ ] Implement `preprocessor.ts` — raw match data → structured signals
- [ ] Extract: possession split, shot efficiency, key events
- [ ] Extract: xG delta (if available), corners, fouls
- [ ] Calculate derived signals: dominance vs efficiency contrast
- [ ] Unit test preprocessor with sample match data

### 1.5 Analysis Generation (Text Only)
- [ ] Implement `analysisGenerator.ts`
- [ ] Build system prompt (pundit persona, reasoning rules, format constraints)
- [ ] Build user prompt template with preprocessed signals
- [ ] Call Anthropic Messages API (Haiku 4.5)
- [ ] Implement `GET /analysis/:matchId` — return text response
- [ ] Test with 3–5 different real matches, iterate on prompt

### 1.6 Frontend Setup
- [ ] Create React + TypeScript app with Vite (`frontend/`)
- [ ] Build `MatchCard` component (team names, score, date)
- [ ] Build `MatchList` component (LiveScore-style feed)
- [ ] Fetch and display matches from `GET /matches`

### 1.7 UI Integration (Text Only)
- [ ] Add "Analyse" button to each `MatchCard`
- [ ] Build `useAnalysis` hook (fetch, loading, error states)
- [ ] Build `LoadingState` component (skeleton/spinner)
- [ ] Display analysis text on button click
- [ ] Disable button while request is in flight

**✅ Checkpoint:** Can click any match → see AI-generated pundit analysis text.

---

## Phase 2 — Audio Generation

> **Goal:** `matchId → fetch → preprocess → LLM → TTS → return text + audio`

### 2.1 TTS Integration
- [ ] Choose TTS provider (ElevenLabs or OpenAI TTS)
- [ ] Implement `ttsService.ts` — text → audio (base64 MP3)
- [ ] Select a pundit-appropriate voice (male, authoritative, natural)
- [ ] Handle TTS errors gracefully (return `audioBase64: null`)

### 2.2 Backend Response Update
- [ ] Update `GET /analysis/:matchId` to return full `AnalysisResponse`:
  ```typescript
  {
    matchId, homeTeam, awayTeam, score,
    analysis, audioBase64, cached, generatedAt
  }
  ```
- [ ] If TTS fails, still return text with `audioBase64: null`

### 2.3 Frontend Audio Player
- [ ] Build `AnalysisPlayer` component (play/pause, progress bar)
- [ ] Convert base64 → audio blob → object URL for playback
- [ ] Auto-play when audio loads
- [ ] Ensure only one match audio plays at a time
- [ ] Show text alongside audio (optional expand/collapse)
- [ ] Text-only fallback when `audioBase64` is null

**✅ Checkpoint:** Click match → hear a pundit-style audio analysis.

---

## Phase 3 — Caching Layer

> **Goal:** Generate once per match, serve from cache forever after.

### 3.1 Cache Interface
- [ ] Define `CacheInterface` (abstract — Open-Closed Principle):
  ```typescript
  interface CacheProvider {
    get(matchId: string): Promise<CachedAnalysis | null>;
    set(matchId: string, data: CachedAnalysis): Promise<void>;
  }
  ```
- [ ] Implement `MemoryCache` (in-memory Map)

### 3.2 Integrate Cache into Pipeline
- [ ] Check cache BEFORE football API / LLM / TTS calls
- [ ] On cache hit: return immediately with `cached: true`
- [ ] On cache miss: run full pipeline → store result → return with `cached: false`
- [ ] Deduplicate concurrent requests for the same matchId (avoid parallel LLM calls)

### 3.3 Verify Cache Behaviour
- [ ] First request: generates fresh (slow)
- [ ] Second request: returns cached (instant)
- [ ] Different matchId: generates fresh

**✅ Checkpoint:** Second click on same match returns instantly. No duplicate LLM/TTS spend.

---

## Phase 4 — Validation & Retry

> **Goal:** Programmatic quality gate before audio generation.

### 4.1 Implement Validator
- [ ] Implement `validator.ts` with concrete checks:
  - [ ] **Length:** 3–5 sentences, 50–200 words
  - [ ] **Team names:** both team names appear in output
  - [ ] **Stat references:** at least 2 specific stats from match data referenced
  - [ ] **TTS-readiness:** no markdown, no bullet points, no special characters
- [ ] Return `{ valid: boolean, failures: string[] }`

### 4.2 Retry Logic
- [ ] On validation failure: retry LLM call with appended feedback
  ```
  "Your previous analysis failed these checks: {failures}.
   Please fix: {specific instructions per failure}."
  ```
- [ ] Maximum 1 retry (keeps latency bounded)
- [ ] If retry also fails: return best attempt with quality flag
- [ ] Log all validation failures for prompt iteration

### 4.3 Insert Validator into Pipeline
- [ ] Validate AFTER LLM, BEFORE TTS
- [ ] Only send validated text to TTS (saves TTS cost on bad outputs)

**✅ Checkpoint:** Analysis consistently hits quality bar. Retry catches edge cases.

---

## Phase 5 — Polish & Deploy

> **Goal:** Production-ready MVP with live URL.

### 5.1 Frontend Polish
- [ ] Loading skeleton state (not just a spinner)
- [ ] Error state UI ("Analysis unavailable, try again")
- [ ] Empty state (no matches available)
- [ ] Mobile-responsive match cards
- [ ] Subtle animation on analysis reveal

### 5.2 Backend Hardening
- [ ] Request timeout handling (10s max for full pipeline)
- [ ] Ensure key pipeline events are logged via Pino: matchId, cache hit/miss, LLM latency, TTS latency, validation failures
- [ ] Use `pino-pretty` in dev, plain JSON in production (env-based)
- [ ] Environment-based config (dev vs production API keys)

### 5.3 Deployment
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Render or Railway
- [ ] Set environment variables in hosting platform
- [ ] Verify CORS between frontend and backend domains
- [ ] Smoke test: end-to-end flow on 3 different matches

### 5.4 Submission Prep
- [ ] Write README — cover: what it is, why this feature, architecture decisions, AI integration rationale, trade-offs
- [ ] Clean up Git history (squash WIP commits)
- [ ] Export AI conversation logs
- [ ] Verify live URL works
- [ ] Submit to Patrick.Phelan@Visory.com.au

**✅ Checkpoint:** Live URL works. Code is clean. README tells the story. Logs show AI fluency.

---

## Time Estimates

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 1 — Data Pipeline + Analysis (incl. Zod validation layer) | 5–6 hours | 5–6 hours |
| Phase 2 — Audio | 2–3 hours | 7–9 hours |
| Phase 3 — Caching | 1–2 hours | 8–11 hours |
| Phase 4 — Output Validation & Retry | 1–2 hours | 9–13 hours |
| Phase 5 — Polish & Deploy | 2–3 hours | 11–16 hours |
| **Total** | **11–16 hours** | ~2 days |

---

## Development Rules

- Complete and test each phase before moving to the next
- Commit at each checkpoint with a descriptive message
- Keep scope minimal — one well-executed feature > ten half-finished ideas
- Iterate on the prompt using real match data, not hypotheticals
- If stuck on a phase for > 1 hour, simplify and move on
- Use AI tools throughout and save conversation logs — they're a submission deliverable
