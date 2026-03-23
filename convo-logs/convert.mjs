import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_DIR = path.join(process.env.USERPROFILE, '.claude', 'projects', 'c--Users-yubik-Documents-projects-matchcast');

const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'));

files.forEach((file, i) => {
  const lines = fs.readFileSync(path.join(LOG_DIR, file), 'utf-8').trim().split('\n');
  let md = `# MatchCast — AI Conversation Log ${i + 1}\n_Source: ${file}_\n\n`;
  let msgCount = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const msg = entry.message;
      if (!msg || !msg.role) continue;

      const content = Array.isArray(msg.content)
        ? msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : typeof msg.content === 'string' ? msg.content : '';

      if (!content.trim()) continue;

      if (msg.role === 'user') {
        md += `## User\n\n${content.trim()}\n\n---\n\n`;
        msgCount++;
      } else if (msg.role === 'assistant') {
        md += `## Assistant\n\n${content.trim()}\n\n---\n\n`;
        msgCount++;
      }
    } catch {}
  }

  const outFile = path.join(__dirname, `conversation-${i + 1}.md`);
  fs.writeFileSync(outFile, md);
  console.log(`conversation-${i + 1}.md — ${msgCount} messages written`);
});
