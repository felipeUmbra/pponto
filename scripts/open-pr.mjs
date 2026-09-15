// Create a PR dev -> main via the GitHub REST API (uses git credential helper).
import { execSync } from 'node:child_process';

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const pass = (cred.match(/^password=(.+)$/m) || [])[1];
if (!pass) throw new Error('no GitHub token from credential helper');

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${pass}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const body = {
  title: 'fix(core): correct Turso HTTP wire format (params + top-level array)',
  head: 'dev',
  base: 'main',
  body: [
    '## Changes',
    '- Turso HTTP wire format: use `params` instead of `args`, top-level `statements` array, root batch.',
    '- scripts/gh-update-secret.mjs: mints DB-scoped token and pushes as VITE_TURSO_TOKEN on github-pages env (CRLF-safe, libsodium sealed box).',
    '- turso-live-check.mjs: verifies real-DB connectivity (passed).',
    '',
    'Tests: 66 unit tests green, live Turso SELECT check passed.',
  ].join('\n'),
};

const res = await fetch('https://api.github.com/repos/felipeUmbra/pponto/pulls', {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});
const json = await res.json();
if (!res.ok) {
  console.error('Failed:', res.status, JSON.stringify(json).slice(0, 300));
  process.exit(1);
}
console.log(`PR #${json.number}: ${json.html_url} state=${json.state}`);