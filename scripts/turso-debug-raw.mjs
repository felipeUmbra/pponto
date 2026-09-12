import { createClient } from '@tursodatabase/api';
const turso = createClient({ org: process.env.TURSO_ORG, token: process.env.TURSO_PLATFORM_TOKEN });
const { jwt } = await turso.databases.createToken('pponto');
const res = await fetch('https://pponto-felipeumbra.aws-ap-northeast-1.turso.io', {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    statements: [{ q: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name" }],
  }),
});
console.log(JSON.stringify(await res.json(), null, 2).slice(0, 1500));