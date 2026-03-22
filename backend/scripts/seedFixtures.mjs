/**
 * One-time script: fetch all EPL 2024 fixtures and save to src/data/fixtures.json
 * Usage: API_FOOTBALL_KEY=your_key node scripts/seedFixtures.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error('Missing API_FOOTBALL_KEY env var');
  process.exit(1);
}

const res = await fetch('https://v3.football.api-sports.io/fixtures?league=39&season=2024&status=FT', {
  headers: { 'x-apisports-key': API_KEY },
});

if (!res.ok) {
  console.error(`API responded with ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();

if (data.errors && Object.keys(data.errors).length > 0) {
  console.error('API error:', JSON.stringify(data.errors));
  process.exit(1);
}

const outDir = path.join(__dirname, '../src/data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'fixtures.json'), JSON.stringify(data.response, null, 2));

console.log(`Done — ${data.response.length} fixtures saved to src/data/fixtures.json`);
