# MatchCast — Architecture

This document explains the key design decisions behind MatchCast: not just what was built, but why each choice was made over the alternatives.

---

## System Overview

```
Browser
  │
  ├─ POST /api/auth/token ──────────────────────────────► Auth Controller
  │                                                          │ issues JWT access token (15min)
  │                                                          │ sets refresh token in HTTP-only cookie (7d)
  │
  ├─ GET /api/matches ──────────────────────────────────► Matches Controller
  │   Authorization: Bearer <token>                          │
  │                                                          └─► fixtures.json (loaded from disk at startup)
  │                                                               zero API calls, survives restarts
  │
  └─ GET /api/analysis/:fixtureId ─────────────────────► Analysis Controller
      Authorization: Bearer <token>                          │
                                                             ├─ Cache hit? → return immediately
                                                             │
                                                             └─ Cache miss:
                                                                  │
                                                                  ├─► api-sports.io (fixture detail only)
                                                                  ├─► preprocessor (raw → signals)
                                                                  ├─► GPT-4o (signals → prose)
                                                                  ├─► ElevenLabs (prose → base64 MP3)
                                                                  └─► MemoryCache (store result)
```

---

## Backend

### Express 5 over Express 4

Express 5 is the current stable release with better async error handling — unhandled promise rejections propagate to error middleware automatically, removing the need for try/catch in every controller.

### Central config with fail-fast

All environment variables are loaded once in `config.ts` via `requireEnv()`. If any required variable is missing, the server throws immediately on startup rather than crashing mid-request or silently returning wrong results. This makes misconfiguration obvious in Railway's deploy logs instantly.

### Layered architecture

Each layer has a single responsibility:

- **Routes** — map HTTP verbs/paths to middleware chains
- **Middleware** — validation, auth, rate limiting (pure pipeline stages)
- **Controllers** — parse request, call service, send response (thin)
- **Services** — all business logic (thick)
- **Cache** — persistence interface, swappable implementation

No business logic sits in controllers. No HTTP concerns leak into services.

### Zod validation middleware

Input is validated at the HTTP boundary before it touches any service. `validateRequest(schema, 'params')` stores the parsed result in `res.locals` — not `req.params` — because Express 5 makes `req.params` read-only. This was a non-obvious Express 5 breaking change.

### Typed error hierarchy

`AppError` → `ValidationError (400)` / `NotFoundError (404)` / `ExternalApiError (502)`. The global error middleware switches on type, so service code throws semantically and the HTTP mapping is centralised in one place.

---

## Analysis Pipeline — Flow Diagram

```
GET /api/analysis/:fixtureId
          │
          ▼
┌─────────────────────┐
│   Check MemoryCache  │
└─────────────────────┘
          │
     Cache hit?
    ┌─────┴──────┐
   YES           NO
    │             │
    ▼             ▼
Return        In-flight Map
cached   ◄──── has key?
result         ┌────┴────┐
(instant)     YES        NO
               │          │
               ▼          ▼
           Await      Register promise
           existing   in inFlight Map
           promise         │
               │           ▼
               │    ┌──────────────────────────────────────────────┐
               │    │  PIPELINE                                     │
               │    │                                               │
               │    │  1. fetchFixtureDetail()                      │
               │    │     api-sports.io → raw JSON                  │
               │    │                                               │
               │    │  2. preprocess()                              │
               │    │     raw JSON → MatchSignals                   │
               │    │     ┌─────────────────────────────────┐       │
               │    │     │ possession · shots · xG · fouls │       │
               │    │     │ corners · passAccuracy · saves   │       │
               │    │     │ goals[] · cards[]                │       │
               │    │     │ ─────────── derived ──────────── │       │
               │    │     │ xGDelta · wasComeback            │       │
               │    │     │ lateGoals · secondHalfGoals      │       │
               │    │     └─────────────────────────────────┘       │
               │    │                                               │
               │    │  3. generateAnalysis()                        │
               │    │     MatchSignals → GPT-4o prompt              │
               │    │     → pundit prose (3-5 sentences)            │
               │    │     model: gpt-4o · temp: 0.7 · max: 300tok  │
               │    │                                               │
               │    │  4. generateAudio()                           │
               │    │     prose → ElevenLabs stream                 │
               │    │     → Buffer chunks → base64 MP3              │
               │    │     model: eleven_multilingual_v2             │
               │    │                                               │
               │    └──────────────────────────────────────────────┘
               │           │
               │           ▼
               │    Store in MemoryCache
               │    Delete from inFlight Map
               │           │
               └───────────┤
                           ▼
                    Return result
                    { analysis, audioBase64,
                      homeTeam, awayTeam,
                      score, cached: false }
```

---

## The Analysis Pipeline

### Data preprocessing as a separate stage

Raw api-sports.io fixture data is messy — statistics are buried in an array of `{ type, value }` objects, events are untyped strings, scores can be null. `preprocessor.ts` converts this into a clean, typed `MatchSignals` struct before it touches any AI code.

This separation means the LLM prompt builder never deals with null-coalescing or string parsing. It also makes the pipeline testable at each stage independently.

### Derived signals for richer narratives

Beyond raw stats, the preprocessor calculates:

- **xGDelta** — the difference between actual goals and expected goals. A team that scored 3 but had xG of 0.8 was clinical (or lucky). This adds context the raw stats don't surface.
- **wasComeback** — was the team losing at half-time but won? Flags dramatic results.
- **lateGoals** — goals scored after 80'. Indicates late pressure or capitulation.
- **secondHalfGoals** — which team dominated the second half.

These derived signals let GPT-4o produce analysis that feels like it watched the match, not just read a stat sheet.

### GPT-4o over GPT-4o-mini

Tested both. GPT-4o-mini produced generic, surface-level commentary that rarely engaged with the stats. GPT-4o consistently referenced specific statistics, drew narrative conclusions, and maintained the pundit tone across different fixture types. The quality delta justified the cost for a portfolio submission.

### Prompt designed for TTS readiness

The system prompt explicitly prohibits markdown, bullet points, and headers. Analysis is constrained to 3-5 sentences of flowing prose. This is intentional — the output goes directly into ElevenLabs without any post-processing, so markdown would be read aloud literally.

### ElevenLabs eleven_multilingual_v2

Selected for natural prosody on sports commentary. The voice is configured as an Australian commentator — appropriate for the submission audience. Audio is streamed from ElevenLabs, chunked into Buffers, concatenated, and base64-encoded for transport.

### Base64 over binary file storage

Audio is returned as a base64 string in the JSON response rather than stored in S3 or served as a file. This is self-contained — no storage infrastructure, no signed URLs, no CDN config. The tradeoff is ~33% payload overhead vs binary. Acceptable for MVP given typical analysis is under 2 minutes of audio.

For scale: S3 + signed URLs would be the next step.

---

## Caching

### Cache-aside pattern

The cache is checked before any external call is made. On a miss, the full pipeline runs (api-sports.io → GPT-4o → ElevenLabs), the result is stored, and returned. On a hit, the result is returned immediately. The pipeline is never run twice for the same fixture.

This matters because a full pipeline run costs money (OpenAI + ElevenLabs tokens) and takes 10-20 seconds. Caching makes the second request free and instant.

### In-flight deduplication

If two requests for the same fixture arrive simultaneously (before the first has finished and cached), without deduplication both would run the full pipeline in parallel — doubling cost and running two concurrent LLM calls.

The `inFlight` Map stores the in-progress `Promise` for each fixture key. Concurrent requests await the same promise rather than starting their own. Only one pipeline runs.

```
Request A ──► cache miss → start pipeline → store promise
Request B ──► cache miss → finds promise → awaits it
Request A ──────────────────────────────────────────────► stores result
Request B ──────────────────────────────────────────────► receives same result
```

### Fixture list: file-based over API

**Problem encountered in production:** The original design fetched all 380 EPL fixtures from api-sports.io on every call to `GET /api/matches` with no caching. This caused two compounding issues:

1. **No request-level caching** — every page load, every "Load More" click, and every TanStack Query retry triggered a fresh api-sports.io call. Combined with Railway redeploys (which restart the process), the 100 requests/day free tier quota was exhausted rapidly, resulting in a suspended API account.

2. **In-flight deduplication alone wasn't enough** — even after adding a module-level in-memory cache, Railway restarts would wipe it and the first burst of requests after each restart would burn through quota again.

**Solution:** Since the 2024 EPL season is complete, the fixture list is immutable. A one-time seed script (`scripts/seedFixtures.mjs`) fetches all 380 fixtures and writes them to `src/data/fixtures.json`, committed to the repo. The service reads this file synchronously at module load time into a module-level constant. api-sports.io is never called for the matches list — not on startup, not on restart, not ever.

**Trade-off acknowledged:** For a live season with new fixtures each week, this approach would not work. The production path would be an api-sports.io Pro subscription with webhook-based updates or a scheduled refresh job, with Redis as the cache layer.

### MemoryCache: why in-process memory for MVP

Alternatives considered:
- **Redis** — persistent, distributed, survives restarts. Overkill for MVP. Requires a separate service.
- **SQLite** — persistent but adds a dependency and schema management.
- **MemoryCache** — zero dependencies, zero latency, simple. Wipes on restart, but fixtures don't change — regenerating on restart is acceptable.

The `CacheProvider` interface keeps the implementation swappable. Redis can replace `MemoryCache` without touching any other code.

### Railway over serverless for backend

A serverless function (Vercel, Netlify, Cloudflare Workers) would wipe the in-memory cache on every invocation — turning every request into a cold pipeline run. Railway runs a persistent Node.js process, so the cache survives across requests. This was a hard requirement for the caching strategy to work.

---

## Security

### Anonymous JWT session auth

There are no user accounts. The app issues a guest JWT on load. The purpose is not authentication in the traditional sense — it's API protection. Without tokens, the analysis endpoint (which costs money per call) would be open to anyone who found the Railway URL.

The flow:
1. `main.tsx` calls `initAuth()` before React renders
2. `POST /api/auth/token` returns an access token (15min JWT) in JSON and sets a refresh token (7d JWT) in an HTTP-only cookie
3. Every subsequent API call attaches `Authorization: Bearer <token>`
4. On 401, Axios response interceptor calls `POST /api/auth/refresh` and retries once
5. The refresh endpoint reads the HTTP-only cookie (never accessible to JavaScript) and issues a new access token

### Access token in memory, never persisted

The access token is stored in a module-level variable in `auth.ts`. It is never written to localStorage or sessionStorage. If the page is refreshed, `initAuth()` runs again and fetches a fresh token via the refresh cookie. This is XSS-safe — a malicious script cannot steal the access token from storage.

### Refresh token in HTTP-only cookie

The refresh token cannot be read by JavaScript. Even if XSS were achieved, the attacker cannot extract the refresh token to generate new access tokens on another machine. `sameSite: 'strict'` prevents CSRF.

### Why proactive refresh was skipped

An alternative would be to schedule token refresh before the 15-minute expiry (e.g., at 14 minutes). This was consciously skipped:

- EPL fixtures are static — users are unlikely to stay on the page for 15+ minutes without making a request
- Proactive refresh requires a timer that runs even when the user is idle
- Reactive refresh (on 401) is simpler, handles all cases, and is invisible to the user

### Rate limiting

Two tiers:
- **Global** — 30 requests per 15 minutes per IP. Protects all endpoints from basic abuse.
- **Analysis** — 10 requests per 15 minutes per IP. The analysis endpoint triggers GPT-4o + ElevenLabs. This limit bounds per-user cost exposure.

### helmet.js

Sets secure HTTP response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, CSP baseline, and others. One line of middleware, significant reduction in attack surface.

---

## Frontend

### TanStack Query for server state

All API calls go through TanStack Query. `staleTime: Infinity` on the analysis query means once a result is fetched, React never refetches it for the lifetime of the page session. Combined with the backend cache, this creates two caching layers:

1. **Backend MemoryCache** — survives across users and browser refreshes
2. **TanStack Query** — prevents redundant network calls within a single session

### Axios with interceptors over native fetch

The original implementation used a manual `apiFetch` wrapper with inline 401 handling and token attachment. Replacing it with Axios:

- Centralises auth concerns in `apiClient.ts` (request + response interceptors)
- Removes duplicated auth logic from `matchcast.api.ts`
- The `_retry` flag on the original request config prevents infinite retry loops if refresh itself returns 401

`auth.ts` intentionally keeps native `fetch` — it bootstraps the tokens and cannot import `apiClient` (which imports from `auth.ts`) without creating a circular dependency.

### useInfiniteQuery for pagination

Matches are loaded 20 at a time with offset-based pagination. `useInfiniteQuery` tracks all pages in a single cache entry, enabling "Load more" without losing previously loaded results. The backend returns `hasMore` to determine whether to show the load more button.

### Blob URL lifecycle and StrictMode

Converting base64 audio to a playable `<audio>` element requires creating a blob URL (`URL.createObjectURL`). React StrictMode double-invokes effects in development. The initial implementation used `useMemo` to create the URL, but `useEffect` cleanup revoked it — on StrictMode's second mount, the memoized URL was already dead.

Fix: both creation and revocation are handled inside a single `useEffect`. The URL is created fresh on mount and revoked on cleanup. StrictMode creates and destroys it twice in dev, but the third (real) mount always has a live URL.

### en-AU locale

Dates are formatted with `toLocaleDateString('en-AU', { weekday: 'long', ... })`. The submission audience is Australian — consistent locale signals attention to detail.

---

## Deployment

| Concern | Frontend | Backend |
|---------|----------|---------|
| Platform | Vercel | Railway |
| Deploy trigger | Push to main | Push to main |
| Env vars | `VITE_API_BASE_URL` | All secrets via Railway Variables |
| Domain | matchcast.vercel.app | matchcast-production.up.railway.app |

CORS is locked to the Vercel domain in production via `CLIENT_ORIGIN`. `NODE_ENV=production` enables `secure: true` on the refresh token cookie (HTTPS-only).

---

## Future Enhancements

| Enhancement | Rationale |
|-------------|-----------|
| Redis | Persistent analysis cache across restarts — fixture list is already file-based; Redis would prevent costly GPT-4o/ElevenLabs re-runs after Railway redeploys |
| S3 + signed URLs | Store audio as binary — 33% smaller, scales to thousands of cached fixtures |
| Dockerfile | Enables Fly.io (free, always-on) and local environment parity |
| Refresh token rotation | Invalidate old refresh token on each use — prevents replay attacks |
| Origin check on `/api/auth/token` | Restrict token issuance to known frontend origins only |
| Multi-agent orchestration | Separate agents for fetch → preprocess → LLM → TTS → validate, with retries per stage |
