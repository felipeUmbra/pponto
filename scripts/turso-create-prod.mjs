/**
 * Create the production database and apply schema + seed.
 * Usage: node scripts/turso-create-prod.mjs
 * Env: TURSO_PLATFORM_TOKEN (management token), TURSO_ORG
 */
import { createClient } from '@tursodatabase/api';

const turso = createClient({ org: process.env.TURSO_ORG, token: process.env.TURSO_PLATFORM_TOKEN });
const DB = 'pponto-prod';
const HOST = `${DB}-felipeumbra.aws-ap-northeast-1.turso.io`;

// 1. Create DB (idempotent-ish; errors if exists)
try {
  const created = await turso.databases.create(DB, { group: 'default' });
  console.log('Created:', created.name ?? created.hostname ?? JSON.stringify(created).slice(0, 200));
} catch (e) {
  console.log('Create note:', e.message);
}

// 2. Mint token
const { jwt } = await turso.databases.createToken(DB);

async function exec(q) {
  const res = await fetch(`https://${HOST}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ q }] }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  FAIL (${res.status}): ${q.slice(0, 80)} -> ${text.slice(0, 200)}`);
    return false;
  }
  return true;
}

// 3. Apply schema from scripts/pponto-schema.sql (strip the TABLES: header line)
import { readFileSync } from 'node:fs';
const raw = readFileSync(new URL('pponto-schema.sql', import.meta.url), 'utf8');
const stmts = raw
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('TABLES:') && !l.startsWith('--'))
  .join('\n');

console.log('Applying schema...');
for (const chunk of stmts.split(';').map((s) => s.trim()).filter(Boolean)) {
  await exec(chunk);
}

// 4. Verify tables
const res = await fetch(`https://${HOST}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    statements: [{ q: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name" }],
  }),
});
const json = await res.json();
const tables = json?.[0]?.results?.rows?.map((r) => r[0]) ?? [];
console.log('Tables in prod:', tables.join(', '));
console.log('Hostname:', HOST);