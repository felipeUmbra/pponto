/**
 * Mint a database-scoped token for the `pponto` DB using the org-level
 * token already present in .env as platform auth. Prints ONLY the new
 * (freshly generated) DB token — never the source token.
 *
 * Usage: node scripts/turso-mint-db-token.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@tursodatabase/api';

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv(new URL('../.env', import.meta.url));
const platformToken = env.VITE_TURSO_TOKEN;
const dbName = process.argv[2] ?? 'pponto';
const org = process.env.TURSO_ORG ?? 'felipeumbra';

if (!platformToken) {
  console.error('VITE_TURSO_TOKEN not found in .env — nothing to use as platform auth.');
  process.exit(1);
}

const turso = createClient({ org, token: platformToken });

try {
  const { jwt } = await turso.databases.createToken(dbName);
  // Only print the freshly minted DB token
  console.log(`DB_SCOPED_TOKEN_FOR_${dbName}=${jwt}`);
} catch (err) {
  console.error(`Mint failed with org token: ${err.message}`);
  console.error('(The VITE_TURSO_TOKEN may not have platform API permission.)');
  process.exit(2);
}