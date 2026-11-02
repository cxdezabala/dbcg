// Lists UI strings passed to t('…') that have no Spanish entry (exact or via pattern rules).
import fs from 'node:fs';
import path from 'node:path';
const es = new Map(JSON.parse(fs.readFileSync('messages/es.json', 'utf8')).dict);
const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx?)$/.test(f)) files.push(p); } };
walk('src');
const found = new Set();
const re = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\)/g;
const lit = /(?:label|title|meta|tag|note|kind|cta|src|text|h|k|module|headline|kicker|status|stageLabel|sub|insight|rowsTitle|rowsHint|shareTitle|caption|value|tip|state|sev|risk|action)\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(re)) if (!m[2].includes('${')) found.add(m[2].replace(/\\'/g, "'"));
  if (/vm\/|views\.ts|scenario\.ts|data\/radar|home-dash|ci-pipe/.test(f)) for (const m of s.matchAll(lit)) found.add(m[2].replace(/\\'/g, "'"));
}
const miss = [...found].filter(k => k && /[A-Za-z]{3}/.test(k) && !es.has(k)).sort();
fs.writeFileSync(process.argv[2] || '/dev/stdout', miss.join('\n') + '\n');
console.error(miss.length + ' strings without Spanish entry (of ' + found.size + ')');
