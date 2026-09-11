/**
 * Turso libSQL HTTP client — typed fetch wrapper.
 * Talks to the Turso HTTP API (REST) for read/write queries.
 */
import { CONFIG } from '../config.js';

export interface TursoRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface TursoResult {
  columns: string[];
  rows: TursoRow[];
  rows_affected: number;
}

/**
 * Normalize the Turso connection URL for the HTTP API:
 * `libsql://db.turso.io` → `https://db.turso.io` (fetch cannot handle libsql://)
 */
function httpUrl(raw: string): string {
  if (raw.startsWith('libsql://')) {
    return `https://${raw.slice('libsql://'.length)}`;
  }
  return raw;
}

const BASE_URL = httpUrl(CONFIG.TURSO_URL);

/**
 * Execute a read-only SQL statement against Turso.
 */
export async function tursoQuery<T extends TursoRow = TursoRow>(
  sql: string,
  args: unknown[] = [],
): Promise<T[]> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.TURSO_TOKEN}`,
    },
    body: JSON.stringify({
      stmt: sql,
      args: args.map((v) => (v === null ? null : String(v))),
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso query failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TursoResult;
  return data.rows as T[];
}

/**
 * Execute a write SQL statement (INSERT/UPDATE/DELETE) against Turso.
 */
export async function tursoExecute(
  sql: string,
  args: unknown[] = [],
): Promise<TursoResult> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.TURSO_TOKEN}`,
    },
    body: JSON.stringify({
      stmt: sql,
      args: args.map((v) => (v === null ? null : String(v))),
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso execute failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as TursoResult;
}

/**
 * Execute multiple statements in a batch.
 */
export async function tursoBatch(
  stmts: { sql: string; args?: unknown[] }[],
): Promise<TursoResult[]> {
  const res = await fetch(BASE_URL + '/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.TURSO_TOKEN}`,
    },
    body: JSON.stringify({
      statements: stmts.map((s) => ({
        stmt: s.sql,
        args: (s.args ?? []).map((v) => (v === null ? null : String(v))),
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso batch failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as TursoResult[];
}
