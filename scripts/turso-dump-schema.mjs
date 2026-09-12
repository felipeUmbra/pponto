/**
 * Dump schema + seed counts from the pponto DB (to replicate in prod).
 */
import { createClient } from '@tursodatabase/api';

const turso = createClient({ org: process.env.TURSO_ORG, token: process.env.TURSO_PLATFORM_TOKEN });
const name = process.argv[2] ?? 'pponto';
const host = `${name}-felipeumbra.aws-ap-northeast-1.turso.io`;
const { jwt } = await turso.databases.createToken(name);
const url = `https://${host}`;

async function run(q) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ q }] }),
  });
  const json = await res.json();
  const rows = json?.[0]?.results?.rows ?? [];
  return rows.map((r) => r[0]);
}

const tables = await run("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
console.log('TABLES:', tables.join(', '));
for (const t of tables) {
  const creates = await run(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t}'`);
  console.log(`\n-- ${t} --`);
  console.log(creates[0] + ';');
}