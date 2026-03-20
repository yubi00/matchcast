# ⚽ MatchCast
## Product Requirements Document (PRD) — v8

---

## 1. Overview

MatchCast enhances a LiveScore-style interface by adding AI-generated audio analysis that explains *why* a football match result occurred. Users see finished match scores, tap a match, and hear a pundit-style breakdown of tactics, key moments, and performance — bridging the gap between knowing the score and understanding the story behind it.

---

## 2. Goals

- Explain match outcomes using AI reasoning over structured match data
- Deliver insights via text and synthesised audio
- Build a clean, focused MVP within 2–3 days
- Demonstrate AI integration patterns: structured prompting, output validation, TTS pipeline
- Enforce strict input validation on all API routes to prevent malformed or malicious requests

---

## 3. Core Features

- LiveScore-style match feed showing recent finished matches
- Per-match AI-generated tactical analysis (3–4 sentences)
- Audio playback of the analysis (pundit voice)
- Optional text view alongside audio
- Caching to avoid repeated LLM/TTS calls for the same match

---

## 4. AI System Design

### 4.1 Data Preprocessing

Raw match data from the football API is normalised into a structured signals object before being passed to the LLM. This directly impacts analysis quality — the model reasons better from derived signals than raw JSON.

**Input signals extracted:**

- Possession split (e.g. 68% vs 32%)
- Shot efficiency: goals / shots on target per team
- xG delta: expected goals vs actual goals (overperformance or underperformance)
- Key events: goals, red cards, penalties, substitution timing
- Dominance indicators: corners, fouls, pass accuracy

**Example preprocessed input:**

```json
{
  "homeTeam": "Liverpool",
  "awayTeam": "Manchester City",
  "score": { "home": 2, "away": 1 },
  "signals": {
    "possessionDominance": "away",
    "possessionSplit": "32-68",
    "shotEfficiency": { "home": "2 goals from 3 shots on target", "away": "1 goal from 8 shots on target" },
    "xgDelta": { "home": "+0.9 (overperformed)", "away": "-1.4 (underperformed)" },
    "keyEvents": [
      "Salah 23' (goal, counter-attack)",
      "Salah 57' (goal, high press turnover)",
      "Haaland 81' (goal, set piece)"
    ],
    "pressureIndicators": "Liverpool forced 14 turnovers in City's defensive third"
  }
}
```

### 4.2 Prompt Design

The prompt enforces pundit-style reasoning — not just what happened, but *why*.

**System prompt:**

```
You are a football pundit delivering a concise post-match analysis.
Your job is to explain WHY the result happened, not just restate the score.

Rules:
- Analyse tactical patterns: which team dominated? How did goals come about?
- Contrast efficiency vs dominance (e.g. a team can dominate possession but lose)
- Reference specific stats and events from the data provided
- Use natural, broadcast-style language as if speaking on TV
- Output exactly 3-4 sentences. No bullet points. No hedging.
- Never start with "In this match" or "Today's match".
```

**User prompt template:**

```
Analyse this match result. Explain why {homeTeam} {result} {awayTeam} {score}.

Match data:
{preprocessedSignals}
```

### 4.3 Output Expectations

- 3–4 sentences, natural broadcast tone
- References at least 2 specific statistics from match data
- Explains causation, not just correlation
- Suitable for direct TTS synthesis (no markdown, no lists)

---

## 5. Technical Architecture

### 5.1 Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend API:** Node.js + Express + TypeScript
- **Football Data:** football-data.org API (free tier) or API-Football
- **LLM:** Anthropic Messages API (Claude Haiku 4.5 for cost efficiency)
- **TTS:** ElevenLabs API or OpenAI TTS
- **Cache:** In-memory (Map) for MVP, SQLite for persistence
- **Input Validation:** Zod — schema-based validation for all API route inputs (path params, query strings)
- **Logging:** Pino — structured JSON logging with request ID, matchId, latency, and cache hit/miss fields

### 5.2 Architecture Flow

```
User clicks match
        │
        ▼
  GET /analysis/:matchId
        │
        ▼
  Zod validation (matchId format)
  Invalid → 400 immediately
        │
        ▼
  ┌─ Cache hit? ──── Yes ──→ Return cached { text, audioUrl }
  │
  No
  │
  ▼
  Fetch match stats from Football API
        │
        ▼
  Preprocess into structured signals
        │
        ▼
  Send to LLM (Messages API, single turn)
        │
        ▼
  Validate output (see §9)
        │
        ▼
  Send text to TTS API → receive audio
        │
        ▼
  Cache { text, audioBase64 } by matchId
        │
        ▼
  Return to frontend
```

### 5.3 API Response Shape

```typescript
// GET /matches
interface Match {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  score: { home: number; away: number };
  status: 'FINISHED';
  utcDate: string;           // ISO timestamp of kick-off
  competition: string;       // e.g. "Premier League"
}
type MatchesResponse = Match[];

// GET /analysis/:matchId
interface AnalysisResponse {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  analysis: string;          // The pundit text
  audioBase64: string | null; // Base64-encoded audio (MP3)
  cached: boolean;
  generatedAt: string;       // ISO timestamp
}
```

---

## 6. Folder Structure

### Backend

```
backend/
  src/
    routes/
      matches.ts
      analysis.ts
    services/
      footballApi.ts        # Fetch match data
      preprocessor.ts       # Raw data → structured signals
      analysisGenerator.ts  # LLM call + prompt construction
      ttsService.ts         # Text → audio
      validator.ts          # Output quality checks
    validation/
      schemas.ts            # Zod schemas for all route inputs
      middleware.ts         # validateRequest middleware (wraps Zod parse)
    cache/
      cacheInterface.ts     # Abstract cache (Open-Closed Principle)
      memoryCache.ts        # In-memory implementation
    utils/
      logger.ts             # Pino logger instance (shared across services)
    app.ts
    server.ts
  .env.example              # Documents required env vars (no secrets committed)
```

### Frontend

```
frontend/
  src/
    components/
      MatchCard.tsx          # Score display + "Analyse" button
      MatchList.tsx          # List of finished matches
      AnalysisPlayer.tsx     # Audio player + text display
      LoadingState.tsx       # Skeleton/spinner during generation
    pages/
      Home.tsx
    services/
      api.ts                # Backend API client
    hooks/
      useAnalysis.ts        # Fetch + cache analysis state
    App.tsx
```

---

## 7. API Design

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/matches` | GET | Returns list of recently finished matches |
| `/analysis/:matchId` | GET | Returns AI analysis + audio for a specific match |

### 7.1 Input Validation (Zod Schemas)

All route inputs are validated via Zod before handler logic runs. Invalid inputs return `400` immediately.

**`GET /matches` — query params:**

```typescript
const MatchesQuerySchema = z.object({
  limit:       z.coerce.number().int().min(1).max(50).default(20),
  competition: z.string().max(10).optional(),   // e.g. "PL", "CL"
  dateFrom:    z.string().date().optional(),     // ISO date "YYYY-MM-DD"
  dateTo:      z.string().date().optional(),
});
```

**`GET /analysis/:matchId` — path params:**

```typescript
const AnalysisParamsSchema = z.object({
  matchId: z.string().min(1).max(20).regex(/^\d+$/, 'matchId must be numeric'),
});
```

**Validation middleware pattern:**

```typescript
// middleware/validateRequest.ts
function validateRequest(schema: ZodSchema, source: 'params' | 'query' | 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
    }
    req[source] = result.data; // replace with parsed/coerced values
    next();
  };
}
```

---

## 8. Caching Strategy

- Cache AI analysis + audio by `matchId`
- Finished matches don't change — cache is effectively permanent
- Eliminates repeated LLM and TTS calls (cost + latency)
- Cache interface follows Open-Closed Principle for extensibility (swap in-memory → SQLite → Redis without changing consuming code)
- Cache key: `matchId`, Cache value: `{ analysis, audioBase64, generatedAt }`

---

## 9. Validation & Quality Control

Before sending analysis to TTS, validate programmatically:

| Check | Criteria | On Failure |
|-------|----------|------------|
| Length | 3–5 sentences (50–200 words) | Retry with feedback: "Your analysis was too short/long. Aim for 3-4 sentences." |
| Team names | Both team names must appear | Retry with feedback: "You must mention both teams by name." |
| Stat references | At least 2 specific stats from match data | Retry with feedback: "Reference specific statistics from the data." |
| Causation | Must not just restate the score | Retry with feedback: "Explain WHY the result happened, not just what happened." |
| TTS-readiness | No markdown, no bullet points, no special characters | Strip and retry |

**Retry budget:** Maximum 1 retry. If the second attempt also fails validation, return the best attempt with a quality flag. This keeps latency bounded.

---

## 10. Error Handling

- **Football API failure:** Return 503 with message "Match data temporarily unavailable"
- **LLM failure/timeout:** Return fallback text: "Analysis is currently unavailable for this match. Please try again later."
- **TTS failure:** Return analysis text with `audioBase64: null` — frontend gracefully shows text-only mode
- **Rate limiting:** Queue requests per match, deduplicate concurrent requests for the same matchId

---

## 11. Latency & UX Considerations

- Show skeleton loading state immediately on button click
- Disable the "Analyse" button while processing (prevent duplicate requests)
- Target total latency: <8 seconds (LLM ~2s + TTS ~3s + network)
- Audio auto-plays when ready, with visible play/pause controls
- Cache makes subsequent requests for the same match instant

---

## 12. Cost Projection

| Component | Cost per request | Notes |
|-----------|-----------------|-------|
| Football API | Free | Free tier: 10 requests/min |
| LLM (Haiku 4.5) | ~$0.005 | ~500 input tokens + ~150 output tokens |
| TTS (ElevenLabs) | ~$0.03 | ~100 words, starter plan |
| **Total per unique match** | **~$0.035** | |
| Weekend match day (50 matches) | **~$1.75** | First request only, then cached |

---

## 13. Development Plan (Phased)

### Phase 1 — Data Pipeline + Basic Analysis

```
matchId → fetch stats → preprocess signals → LLM → return text
```

**Tasks:**
- Implement `GET /analysis/:matchId` endpoint
- Build football API integration (`footballApi.ts`)
- Build preprocessor: raw stats → structured signals (`preprocessor.ts`)
- Construct prompt with preprocessed data
- Generate analysis text via Anthropic Messages API
- Return plain text response

**Why preprocessing is Phase 1:** The quality of every subsequent phase depends on input quality. Feeding raw JSON to the LLM produces generic output. Feeding structured signals produces sharp pundit analysis.

---

### Phase 2 — Audio Generation

```
matchId → fetch → preprocess → LLM → TTS → return text + audio
```

**Tasks:**
- Integrate TTS API (ElevenLabs or OpenAI TTS)
- Return audio as base64 alongside text
- Build `AnalysisPlayer` component with play/pause
- Handle TTS failure gracefully (text-only fallback)

---

### Phase 3 — Caching Layer

```
cache check → [miss: fetch → preprocess → LLM → TTS → cache] → return
```

**Tasks:**
- Implement `CacheInterface` (abstract)
- Implement `MemoryCache` (in-memory Map)
- Cache by `matchId` after successful generation
- Return cached results on subsequent requests
- Add `cached: boolean` to response

---

### Phase 4 — Validation & Retry

```
LLM → validate → [fail: retry with feedback] → TTS
```

**Tasks:**
- Implement validation checks (length, team names, stats, causation)
- Add single retry with specific feedback on failure
- Log validation failures for prompt iteration
- Ensure retry stays within latency budget

---

### Phase 5 — Polish & Deploy

**Tasks:**
- Loading states, error states, empty states in frontend
- Mobile-responsive match cards
- Deploy frontend to Vercel
- Deploy backend to Render or Railway
- Smoke test end-to-end with real match data
- Write README covering: what, why, architecture decisions, AI integration rationale

---

## 14. Key Differentiator

AI-powered tactical explanations delivered as audio within a familiar LiveScore-style interface, simulating a football pundit experience. The gap it fills: every score app tells you *what* happened — MatchCast tells you *why*.

---