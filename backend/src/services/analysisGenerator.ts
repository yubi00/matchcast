import OpenAI from 'openai';
import config from '../config';
import type { MatchSignals } from './preprocessor';

const client = new OpenAI({ apiKey: config.openAiApiKey });

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a sharp, insightful football pundit in the style of a Premier League analyst.
Your job is to deliver a concise post-match verdict.

Rules:
- Write in flowing prose — no bullet points, no markdown, no headers
- 3 to 5 sentences, around 80 to 150 words
- Reference at least 2 specific statistics from the match data
- Mention both teams by name
- Draw a clear narrative conclusion about the result
- Tone: authoritative but engaging, like a Sky Sports half-time analysis`;

// ── Generator ─────────────────────────────────────────────────────────────────

export async function generateAnalysis(signals: MatchSignals): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(signals) },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const text = response.choices[0]?.message.content?.trim();
  if (!text) throw new Error('OpenAI returned empty response');

  return text;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(s: MatchSignals): string {
  const goalLines = s.goals.length
    ? s.goals
        .map((g) => {
          const assist = g.assist ? ` (assist: ${g.assist})` : '';
          const type = g.type !== 'normal' ? ` [${g.type}]` : '';
          return `  ${g.minute}' — ${g.scorer}${assist}${type} (${g.team})`;
        })
        .join('\n')
    : '  None';

  const cardLines = s.cards.length
    ? s.cards
        .map((c) => `  ${c.minute}' — ${c.player} (${c.team}) — ${c.type} card`)
        .join('\n')
    : '  None';

  const lateGoalSummary = s.lateGoals.length
    ? s.lateGoals.map((g) => `${g.scorer} ${g.minute}'`).join(', ')
    : 'None';

  return `Match: ${s.homeTeam} vs ${s.awayTeam}
Round: ${s.round} | Venue: ${s.venue} | Referee: ${s.referee ?? 'Unknown'}

Score: ${s.score.fulltime.home} - ${s.score.fulltime.away} (HT: ${s.score.halftime.home} - ${s.score.halftime.away})

Goals:
${goalLines}

Cards:
${cardLines}

${s.homeTeam} stats:
  Possession: ${s.homeStats.possession ?? 'N/A'}% | Shots on target / total: ${s.homeStats.shotsOnTarget ?? 'N/A'} / ${s.homeStats.totalShots ?? 'N/A'}
  xG: ${s.homeStats.xG ?? 'N/A'} | Corners: ${s.homeStats.corners ?? 'N/A'} | Pass accuracy: ${s.homeStats.passAccuracy ?? 'N/A'}%

${s.awayTeam} stats:
  Possession: ${s.awayStats.possession ?? 'N/A'}% | Shots on target / total: ${s.awayStats.shotsOnTarget ?? 'N/A'} / ${s.awayStats.totalShots ?? 'N/A'}
  xG: ${s.awayStats.xG ?? 'N/A'} | Corners: ${s.awayStats.corners ?? 'N/A'} | Pass accuracy: ${s.awayStats.passAccuracy ?? 'N/A'}%

Second half goals — ${s.homeTeam}: ${s.secondHalfGoals.home}, ${s.awayTeam}: ${s.secondHalfGoals.away}
Late goals (80'+): ${lateGoalSummary}`;
}
