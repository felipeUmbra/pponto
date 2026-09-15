/**
 * Turso libSQL HTTP client — typed fetch wrapper.
 * Talks to the Turso HTTP API (REST) for read/write queries.
 *
 * Wire format (verified against the live Turso HTTP endpoint):
 *   POST <db-url>  body: {"statements": [{"q": sql, "params": [...]}]}
 *   Response:       [{ "results": {"columns": [...], "rows": [[...], ...]} }]
 * NOTE: the response is ALWAYS a top-level JSON array (even for a single
 * statement), and the parameter field is `params` (not `args`).
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

interface TursoRawResult {
  columns: string[];
  rows: unknown[][];
  rows_affected?: number;
}

/** Single item from the top-level Turso response array. */
interface TursoResultItem {
  results?: TursoRawResult | null;
  error?: string;
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

/** Convert Turso's {columns, rows[]} wire format to an array of row objects. */
export function rowsToObjects(raw: TursoRawResult): TursoRow[] {
  const cols = raw.columns ?? [];
  return (raw.rows ?? []).map((r) => {
    const obj: TursoRow = {};
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i] ?? null;
    return obj;
  });
}

/** Parse a single TursoResultItem into a TursoResult (object rows). */
function parseItem(item: TursoResultItem): TursoResult {
  if (item.error) throw new Error(`Turso: ${item.error}`);
  const raw = item.results;
  if (!raw) {
    throw new Error(`Turso response missing results: ${JSON.stringify(item).slice(0, 200)}`);
  }
  return {
    columns: raw.columns ?? [],
    rows: rowsToObjects(raw),
    rows_affected: raw.rows_affected ?? 0,
  };
}

/**
 * Parse the full Turso HTTP response body.
 * The wire format is ALWAYS `[{results: ...}]` (top-level array),
 * even for a single statement.
 */
function parseBody(body: unknown): TursoResult {
  if (Array.isArray(body)) {
    if (body.length === 0) throw new Error('Turso returned empty response');
    return parseItem(body[0]);
  }
  // Fallback for rare non-array responses (malformed / old format)
  return parseItem(body as TursoResultItem);
}

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
      statements: [{ q: sql, params: args.map((v) => (v === null ? null : String(v))) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso query failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return parseBody(body).rows as T[];
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
      statements: [{ q: sql, params: args.map((v) => (v === null ? null : String(v))) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso execute failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return parseBody(body);
}

/**
 * Execute multiple statements in a batch.
 * Turso's HTTP endpoint accepts multiple statements at the root URL:
 *   POST <db-url>  body: {"statements": [{"q": sql, "args": [...]}, ...]}
 * and returns an array of {results: {...}} when more than one statement
 * is sent (single statement returns a bare {results: {...}}).
 */
export async function tursoBatch(
  stmts: { sql: string; args?: unknown[] }[],
): Promise<TursoResult[]> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.TURSO_TOKEN}`,
    },
    body: JSON.stringify({
      statements: stmts.map((s) => ({
        q: s.sql,
        params: (s.args ?? []).map((v) => (v === null ? null : String(v))),
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Turso batch failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as unknown;
  const items = Array.isArray(body) ? body : [body];
  return items.map(parseItem);
}
