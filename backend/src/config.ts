import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const config = {
  port: parseInt(process.env['PORT'] ?? '3000'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  redisUrl: process.env['REDIS_URL'],
  openAiApiKey: requireEnv('OPENAI_API_KEY'),
  apiFootballKey: requireEnv('API_FOOTBALL_KEY'),
  apiFootballBaseUrl: requireEnv('API_FOOTBALL_BASE_URL'),
  elevenLabsApiKey: requireEnv('ELEVENLABS_API_KEY'),
  elevenLabsVoiceId: requireEnv('ELEVENLABS_VOICE_ID'),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  clientOrigin: requireEnv('CLIENT_ORIGIN'),
  uploadThingToken: requireEnv('UPLOADTHING_TOKEN'),
} as const;

export default config;
