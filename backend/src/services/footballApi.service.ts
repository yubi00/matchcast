import fs from 'fs';
import path from 'path';
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

export interface ApiFixtureDetail {
  fixture: {
    id: number;
    referee: string | null;
    date: string;
    venue: { name: string; city: string };
    status: { long: string; short: string; elapsed: number };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
  events: Array<{
    time: { elapsed: number; extra: number | null };
    team: { id: number; name: string };
    player: { id: number | null; name: string | null };
    assist: { id: number | null; name: string | null };
    type: string;
    detail: string;
    comments: string | null;
  }>;
  statistics: Array<{
    team: { id: number; name: string };
    statistics: Array<{ type: string; value: number | string | null }>;
  }>;
}

// ── Seeded fixture data (loaded once from disk) ───────────────────────────────

const FIXTURES_PATH = path.join(__dirname, '../data/fixtures.json');

function loadFixturesFromDisk(): Match[] {
  const raw = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf-8')) as ApiFixture[];
  return raw.map(mapFixture);
}

const fixturesCache: Match[] = loadFixturesFromDisk();

// ── Service ─────────────────────────────────────────────────────────────────

export async function fetchMatches(): Promise<Match[]> {
  return fixturesCache;
}

export async function fetchFixtureDetail(fixtureId: number): Promise<ApiFixtureDetail> {
  const url = `${config.apiFootballBaseUrl}/fixtures?id=${fixtureId}`;

  const response = await fetch(url, {
    headers: { 'x-apisports-key': config.apiFootballKey },
  });

  if (!response.ok) {
    throw new ExternalApiError(`API-Football responded with ${response.status}`);
  }

  const data = (await response.json()) as ApiFixtureDetailResponse;

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new ExternalApiError(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  const detail = data.response[0];

  if (!detail) {
    throw new ExternalApiError(`Fixture ${fixtureId} not found`);
  }

  return detail;
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

interface ApiFixtureDetailResponse {
  errors: Record<string, string> | unknown[];
  response: ApiFixtureDetail[];
}
