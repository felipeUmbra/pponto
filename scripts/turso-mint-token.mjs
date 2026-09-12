/**
 * One-off: create a read-write token for a database and print it.
 * Usage: node scripts/turso-mint-token.mjs <db-name>
 */
import { createClient } from '@tursodatabase/api';

const turso = createClient({ org: process.env.TURSO_ORG, token: process.env.TURSO_PLATFORM_TOKEN });
const name = process.argv[2] ?? 'pponto';
const { jwt } = await turso.databases.createToken(name);
console.log(jwt);