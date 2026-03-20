import config from '../config';
import { ExternalApiError } from '../errors/AppError';

// ── Public types ────────────────────────────────────────────────────────────

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
}

// ── Service ─────────────────────────────────────────────────────────────────

export async function fetchMatches(): Promise<Match[]> {
  const url = `${config.apiFootballBaseUrl}/fixtures?league=39&season=2024&status=FT`;

  const response = await fetch(url, {
    headers: { 'x-apisports-key': config.apiFootballKey },
  });

  if (!response.ok) {
    throw new ExternalApiError(`API-Football responded with ${response.status}`);
  }

  const data = (await response.json()) as ApiFixturesResponse;

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new ExternalApiError(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response.map(mapFixture);
}

// ── Mapping ──────────────────────────────────────────────────────────────────

function mapFixture(f: ApiFixture): Match {
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    round: f.league.round,
    venue: f.fixture.venue.name,
    homeTeam: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
    awayTeam: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
    score: {
      halftime: f.score.halftime,
      fulltime: f.score.fulltime,
    },
    status: f.fixture.status.short,
  };
}

// ── Internal API response types (not exported) ────────────────────────────────

interface ApiFixturesResponse {
  errors: Record<string, string> | unknown[];
  response: ApiFixture[];
}

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    venue: { name: string; city: string };
    status: { long: string; short: string; elapsed: number };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}
