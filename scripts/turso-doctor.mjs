/**
 * Turso platform diagnostics — inventory, health, and token creation.
 * Run with: node scripts/turso-doctor.mjs
 */
import { createClient } from '@tursodatabase/api';

const TOKEN = process.env.TURSO_PLATFORM_TOKEN ?? '';
const ORG = process.env.TURSO_ORG ?? 'felipeumbra';

if (!TOKEN) {
  console.error('Set TURSO_PLATFORM_TOKEN env var (management token).');
  process.exit(1);
}

const turso = createClient({ org: ORG, token: TOKEN });

const section = (t) => console.log(`\n=== ${t} ===`);

section('Organizations');
try {
  const orgs = await turso.organizations.list();
  console.log(JSON.stringify(orgs, null, 2));
} catch (e) {
  console.error('org list failed:', e.message);
}

section('Databases in org ' + ORG);
let dbs;
try {
  dbs = await turso.databases.list();
  for (const db of dbs) {
    console.log(`- ${db.name}  host=${db.hostname}  arch=${db.archived}  sleep=${db.sleeping}  region=${db.primaryRegion}`);
  }
} catch (e) {
  console.error('db list failed:', e.message);
}

section('Health check per database (SELECT tables + row counts via HTTP)');
if (dbs) {
  for (const db of dbs) {
    try {
      // Mint a fresh readable token, then hit the libsql HTTP endpoint.
      const { jwt } = await turso.databases.createToken(db.name);
      const url = `https://${db.hostname}`;
      const q = `SELECT 'users' AS tbl, COUNT(*) AS n FROM users UNION ALL SELECT 'punches', COUNT(*) FROM punches UNION ALL SELECT 'geofences', COUNT(*) FROM geofences UNION ALL SELECT 'departments', COUNT(*) FROM departments UNION ALL SELECT 'company_settings', COUNT(*) FROM company_settings UNION ALL SELECT 'medical_certificates', COUNT(*) FROM medical_certificates UNION ALL SELECT 'adjustment_requests', COUNT(*) FROM adjustment_requests`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ statements: [{ q }] }),
      });
      const text = await res.text();
      console.log(`- ${db.name}: HTTP ${res.status} ${res.statusText}`);
      if (res.ok) {
        try {
          const json = JSON.parse(text);
          const rows = json?.results?.[0]?.response?.result?.rows ?? [];
          for (const row of rows) console.log(`    ${row[0]} = ${row[1]}`);
        } catch {
          console.log(`    (non-JSON) ${text.slice(0, 200)}`);
        }
      } else {
        console.log(`    ${text.slice(0, 200)}`);
      }
    } catch (e) {
      console.log(`- ${db.name}: ERROR ${e.message}`);
    }
  }
}

section('Done');