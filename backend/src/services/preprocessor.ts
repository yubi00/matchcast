import type { ApiFixtureDetail } from './footballApi.service';

// ── Output types ─────────────────────────────────────────────────────────────

export interface GoalEvent {
  minute: number;
  extraMinute: number | null;
  team: 'home' | 'away';
  scorer: string;
  assist: string | null;
  type: 'normal' | 'penalty' | 'own_goal';
}

export interface CardEvent {
  minute: number;
  team: 'home' | 'away';
  player: string;
  type: 'yellow' | 'red' | 'yellow_red';
}

export interface TeamStats {
  possession: number | null;
  shotsOnTarget: number | null;
  totalShots: number | null;
  corners: number | null;
  fouls: number | null;
  xG: number | null;
  passAccuracy: number | null;
  goalkeeperSaves: number | null;
}

export interface MatchSignals {
  fixtureId: number;
  date: string;
  round: string;
  venue: string;
  referee: string | null;
  homeTeam: string;
  awayTeam: string;
  score: {
    halftime: { home: number; away: number };
    fulltime: { home: number; away: number };
  };
  result: 'home_win' | 'away_win' | 'draw';
  goals: GoalEvent[];
  cards: CardEvent[];
  homeStats: TeamStats;
  awayStats: TeamStats;
  // Derived
  secondHalfGoals: { home: number; away: number };
  lateGoals: GoalEvent[]; // 80'+
  wasComeback: boolean;
  xGDelta: { home: number | null; away: number | null };
}

// ── Preprocessor ─────────────────────────────────────────────────────────────

export function preprocess(raw: ApiFixtureDetail): MatchSignals {
  const homeId = raw.teams.home.id;
  const fulltimeHome = raw.score.fulltime.home ?? 0;
  const fulltimeAway = raw.score.fulltime.away ?? 0;

  const goals = extractGoals(raw, homeId);
  const cards = extractCards(raw, homeId);

  return {
    fixtureId: raw.fixture.id,
    date: raw.fixture.date,
    round: raw.league.round,
    venue: raw.fixture.venue.name,
    referee: raw.fixture.referee,
    homeTeam: raw.teams.home.name,
    awayTeam: raw.teams.away.name,
    score: {
      halftime: {
        home: raw.score.halftime.home ?? 0,
        away: raw.score.halftime.away ?? 0,
      },
      fulltime: { home: fulltimeHome, away: fulltimeAway },
    },
    result: deriveResult(fulltimeHome, fulltimeAway),
    goals,
    cards,
    homeStats: extractTeamStats(raw, homeId),
    awayStats: extractTeamStats(raw, raw.teams.away.id),
    secondHalfGoals: deriveSecondHalfGoals(goals),
    lateGoals: goals.filter((g) => g.minute >= 80),
    wasComeback: deriveWasComeback(raw, fulltimeHome, fulltimeAway),
    xGDelta: deriveXGDelta(raw, homeId),
  };
}

// ── Extractors ────────────────────────────────────────────────────────────────

function extractGoals(raw: ApiFixtureDetail, homeId: number): GoalEvent[] {
  return raw.events
    .filter((e) => e.type === 'Goal')
    .map((e) => ({
      minute: e.time.elapsed,
      extraMinute: e.time.extra,
      team: e.team.id === homeId ? 'home' : 'away',
      scorer: e.player.name ?? 'Unknown',
      assist: e.assist.name ?? null,
      type: mapGoalType(e.detail),
    }));
}

function extractCards(raw: ApiFixtureDetail, homeId: number): CardEvent[] {
  return raw.events
    .filter((e) => e.type === 'Card')
    .map((e) => ({
      minute: e.time.elapsed,
      team: e.team.id === homeId ? 'home' : 'away',
      player: e.player.name ?? 'Unknown',
      type: mapCardType(e.detail),
    }));
}

function extractTeamStats(raw: ApiFixtureDetail, teamId: number): TeamStats {
  const teamEntry = raw.statistics.find((s) => s.team.id === teamId);
  if (!teamEntry) return emptyStats();

  const get = (type: string): number | string | null =>
    teamEntry.statistics.find((s) => s.type === type)?.value ?? null;

  return {
    possession: parsePercent(get('Ball Possession')),
    shotsOnTarget: asNumber(get('Shots on Goal')),
    totalShots: asNumber(get('Total Shots')),
    corners: asNumber(get('Corner Kicks')),
    fouls: asNumber(get('Fouls')),
    xG: parseFloat_(get('expected_goals')),
    passAccuracy: parsePercent(get('Passes %')),
    goalkeeperSaves: asNumber(get('Goalkeeper Saves')),
  };
}

// ── Derived ───────────────────────────────────────────────────────────────────

function deriveResult(home: number, away: number): MatchSignals['result'] {
  if (home > away) return 'home_win';
  if (away > home) return 'away_win';
  return 'draw';
}

function deriveWasComeback(raw: ApiFixtureDetail, ftHome: number, ftAway: number): boolean {
  const htHome = raw.score.halftime.home ?? 0;
  const htAway = raw.score.halftime.away ?? 0;
  const htLoser = htHome < htAway ? 'home' : htAway < htHome ? 'away' : null;
  if (!htLoser) return false;
  return htLoser === 'home' ? ftHome > ftAway : ftAway > ftHome;
}

function deriveXGDelta(raw: ApiFixtureDetail, homeId: number): { home: number | null; away: number | null } {
  const getXG = (teamId: number): number | null => {
    const entry = raw.statistics.find((s) => s.team.id === teamId);
    const val = entry?.statistics.find((s) => s.type === 'expected_goals')?.value ?? null;
    return val !== null ? parseFloat(String(val)) || null : null;
  };

  const homeXG = getXG(homeId);
  const awayXG = getXG(raw.teams.away.id);
  const ftHome = raw.score.fulltime.home ?? 0;
  const ftAway = raw.score.fulltime.away ?? 0;

  return {
    home: homeXG !== null ? Math.round((ftHome - homeXG) * 100) / 100 : null,
    away: awayXG !== null ? Math.round((ftAway - awayXG) * 100) / 100 : null,
  };
}

function deriveSecondHalfGoals(goals: GoalEvent[]): { home: number; away: number } {
  const secondHalf = goals.filter((g) => g.minute > 45);
  return {
    home: secondHalf.filter((g) => g.team === 'home').length,
    away: secondHalf.filter((g) => g.team === 'away').length,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapGoalType(detail: string): GoalEvent['type'] {
  if (detail === 'Own Goal') return 'own_goal';
  if (detail === 'Penalty') return 'penalty';
  return 'normal';
}

function mapCardType(detail: string): CardEvent['type'] {
  if (detail === 'Red Card') return 'red';
  if (detail === 'Yellow Red Card') return 'yellow_red';
  return 'yellow';
}

function parsePercent(value: number | string | null): number | null {
  if (value === null) return null;
  const n = parseFloat(String(value).replace('%', ''));
  return isNaN(n) ? null : n;
}

function parseFloat_(value: number | string | null): number | null {
  if (value === null) return null;
  const n = parseFloat(String(value));
  return isNaN(n) ? null : n;
}

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function emptyStats(): TeamStats {
  return {
    possession: null,
    shotsOnTarget: null,
    totalShots: null,
    corners: null,
    fouls: null,
    xG: null,
    passAccuracy: null,
    goalkeeperSaves: null,
  };
}
