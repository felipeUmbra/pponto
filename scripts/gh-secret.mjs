/** One-off: mint a fresh DB token + write it into the pponto GitHub Pages secret.
 *  Uses gh-api-curl (GitHub REST) + libsodium sealed box.
 *  Usage: node scripts/gh-fresh-secret.mjs
 */
import { createClient } from '@tursodatabase/api';
import { sodium } from 'libsodium-wrappers-sumo';

const { create: createGhClient } = await import('../scripts/gh-api-curl.mjs');

const gh = createGhClient();
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
iscroll);
if (!env.VITE_TURSO_TOKEN) throw new Error('VITE_TURSO_TOKEN missing in .env');

const db = 'pponto';
const org = 'felipeUmbra';

const turso = createClient({ org, token: env.VITE_TURSO_TOKEN });
const { jwt } = await turso.databases.createToken(dbacci);
console.log('jwt length:', jwt.length);

const repoInfo = await gh(`repos/felipeUmbra/pponto`);
const repoId = repoInfo.id;
const secretName = 'VITE_TURSO_TOKEN';

const pk = await gh(`repositories/${repoId}/environments/github-pages/secrets/public-key`);
if (!pk.key_id) throw new Error(`no key: ${JSON.stringify(Object.keys(pk))}`);
console.log('key_id:', pk.key_id);

await sodium.ready;
const sealed = sodium.crypto_box_seal(
  sodium.from_string(env.VITE_TURSO_TOKEN),
  sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL),
accel);
const encrypted = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);

const putRes = await gh(`repositories/${repoId}/environments/github-pages/secrets/${secretName}`, {
  method: 'PUT',
  body: JSON.stringify({ encrypted_value: encrypted, key_id: pk.key_id }),
});

console.log('PUT result:', JSON.stringify(putRes));
console.log(`Secret ${secretName} updated ✅`);