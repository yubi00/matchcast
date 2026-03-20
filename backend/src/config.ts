import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const config = {
  port: parseInt(process.env['PORT'] ?? '3000'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  openAiApiKey: requireEnv('OPENAI_API_KEY'),
  apiFootballKey: requireEnv('API_FOOTBALL_KEY'),
  apiFootballBaseUrl: requireEnv('API_FOOTBALL_BASE_URL'),
} as const;

export default config;
