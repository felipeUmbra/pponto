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
  title: 'fix(pwa): bump SW cache to v6 for corrected Turso bundle',
  head: 'dev',
  base: 'main',
  body: [
    '## Changes',
    '- Bump service worker cache from pponto-v5 to pponto-v6.',
    '',
    'Existing clients cached the old app shell (which referenced the pre-fix Turso bundle). Bumping the cache version forces the new SW to install, drop the old cache, and precache the corrected shell referencing `index-Bvk_KZUl.js` (has the `params` wire format + DB-scoped token).',
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