/**
 * One-off: verify pponto DB tables + row counts using a minted token.
 */
import { createClient } from '@tursodatabase/api';

const turso = createClient({ org: process.env.TURSO_ORG, token: process.env.TURSO_PLATFORM_TOKEN });

const name = 'pponto';
const { jwt } = await turso.databases.createToken(name);
const url = 'https://pponto-felipeumbra.aws-ap-northeast-1.turso.io';

async function run(q) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ statements: [{ q }] }),
  });
  const text = await res.text();
  console.log(`-- [${res.status}] ${q}`);
  console.log(text.slice(0, 2000));
}

await run("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
await run(`SELECT 'users' t, COUNT(*) n FROM users
  UNION ALL SELECT 'departments', COUNT(*) FROM departments
  UNION ALL SELECT 'punches', COUNT(*) FROM punches
  UNION ALL SELECT 'geofences', COUNT(*) FROM geofences
  UNION ALL SELECT 'company_settings', COUNT(*) FROM company_settings
  UNION ALL SELECT 'medical_certificates', COUNT(*) FROM medical_certificates
  UNION ALL SELECT 'adjustment_requests', COUNT(*) FROM adjustment_requests
  UNION ALL SELECT 'work_schedules', COUNT(*) FROM work_schedules
  UNION ALL SELECT 'schedule_assignments', COUNT(*) FROM schedule_assignments`);