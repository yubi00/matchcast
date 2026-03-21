// ── Cached data shape ─────────────────────────────────────────────────────────

export interface CachedAnalysis {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  score: {
    halftime: { home: number; away: number };
    fulltime: { home: number; away: number };
  };
  analysis: string;
  audioBase64: string | null;
  generatedAt: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface CacheProvider {
  get(key: string): Promise<CachedAnalysis | null>;
  set(key: string, data: CachedAnalysis): Promise<void>;
}
