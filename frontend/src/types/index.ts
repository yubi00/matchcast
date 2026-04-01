export interface Match {
  id: number;
  date: string;
  round: string;
  venue: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
  status: string;
  hasAnalysis: boolean;
}

export interface MatchesResponse {
  matches: Match[];
  total: number;
  hasMore: boolean;
}

export interface Analysis {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  score: {
    halftime: { home: number; away: number };
    fulltime: { home: number; away: number };
  };
  analysis: string;
  audioBase64: string | null;
  cached: boolean;
  generatedAt: string;
}
