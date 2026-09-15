/**
 * Update the `VITE_TURSO_TOKEN` secret on the github-pages environment
 * using the GitHub REST API + libsodium sealed-box encryption.
 *
 * Usage: node scripts/gh-update-secret.mjs
 * Reads the fresh DB token from .env (VITE_TURSO_TOKEN).
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import sodium from 'libsodium-wrappers';

function loadEnv(path) {
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    // CRLF-safe: strip trailing \r so Windows line endings don't corrupt values
    const line = raw.replace(/\r$/, '');
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function ghToken() {
  // Use the git credential helper to fetch the GitHub token
  const cred = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  const m = cred.match(/^password=(.+)$/m);
  if (!m) throw new Error('Could not read GitHub token from git credential helper');
  return m[1];
}

const env = loadEnv(new URL('../.env', import.meta.url));
console.log('env keys found:', Object.keys(env));
const token = env.VITE_TURSO_TOKEN;
if (!token) throw new Error('VITE_TURSO_TOKEN missing in .env');

const repo = 'felipeUmbra/pponto';
const secretName = 'VITE_TURSO_TOKEN';
const gh = ghToken();
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${gh}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const repoInfo = await (await fetch(`https://api.github.com/repos/${repo}`, { headers })).json();
const repoId = repoInfo.id;

const pkRes = await fetch(
  `https://api.github.com/repositories/${repoId}/environments/github-pages/secrets/public-key`,
  { headers },
);
const pkJson = await pkRes.json();
if (!pkJson.key_id) throw new Error(`No key_id: ${JSON.stringify(pkJson)}`);
console.log('key_id:', pkJson.key_id);

// libsodium crypto_box_seal (sealed box) — the GitHub-documented algorithm
await sodium.ready;
const sealed = sodium.crypto_box_seal(
  sodium.from_string(token),
  sodium.from_base64(pkJson.key, sodium.base64_variants.ORIGINAL),
);
const encryptedValue = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);

const putRes = await fetch(
  `https://api.github.com/repositories/${repoId}/environments/github-pages/secrets/${secretName}`,
  {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: pkJson.key_id,
    }),
  },
);
console.log('PUT status:', putRes.status);
if (!putRes.ok) console.log('PUT body:', await putRes.text());
else console.log(`Secret ${secretName} updated on github-pages environment ✅`);