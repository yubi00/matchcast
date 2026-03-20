import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const config = {
  port: parseInt(process.env['PORT'] ?? '3000'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  footballApiKey: requireEnv('FOOTBALL_API_KEY'),
  footballApiBaseUrl: requireEnv('FOOTBALL_API_BASE_URL'),
  openAiApiKey: requireEnv('OPENAI_API_KEY'),
} as const;

export default config;
