import { MemoryCache } from '../cache/memoryCache';
import type { CachedAnalysis } from '../cache/cacheProvider';
import { fetchFixtureDetail } from './footballApi.service';
import { preprocess } from './preprocessor';
import { generateAnalysis } from './analysisGenerator';
import { generateAudio } from './ttsService';
import logger from '../utils/logger';

const cache = new MemoryCache();

// Tracks in-flight requests to prevent duplicate API + LLM calls for the same fixture
const inFlight = new Map<string, Promise<CachedAnalysis>>();

export async function getAnalysis(fixtureId: number): Promise<CachedAnalysis & { cached: boolean }> {
  const key = String(fixtureId);

  const cached = await cache.get(key);
  if (cached) {
    logger.info({ fixtureId }, 'cache hit');
    return { ...cached, cached: true };
  }

  // If a request for this fixture is already in-flight, await it instead of firing a new one
  const existing = inFlight.get(key);
  if (existing) {
    logger.info({ fixtureId }, 'awaiting in-flight request');
    return { ...(await existing), cached: false };
  }

  const pipeline = runPipeline(fixtureId);
  inFlight.set(key, pipeline);

  try {
    const result = await pipeline;
    await cache.set(key, result);
    logger.info({ fixtureId }, 'cache miss — generated and cached');
    return { ...result, cached: false };
  } finally {
    inFlight.delete(key);
  }
}

async function runPipeline(fixtureId: number): Promise<CachedAnalysis> {
  const raw = await fetchFixtureDetail(fixtureId);
  const signals = preprocess(raw);
  const analysis = await generateAnalysis(signals);
  const audioBase64 = await generateAudio(analysis);

  return {
    fixtureId: signals.fixtureId,
    homeTeam: signals.homeTeam,
    awayTeam: signals.awayTeam,
    score: signals.score,
    analysis,
    audioBase64,
    generatedAt: new Date().toISOString(),
  };
}
