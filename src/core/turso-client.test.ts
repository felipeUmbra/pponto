import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch before importing turso-client
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('turso-client', () => {
  it('executes a query and returns rows as objects', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            results: {
              columns: ['id', 'name'],
              rows: [['usr-001', 'Ana Beatriz Souza']],
              rows_affected: 0,
            },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { tursoQuery } = await import('./turso-client.js');
    const rows = await tursoQuery('SELECT id, name FROM users WHERE id = ?', ['usr-001']);

    expect(rows).toEqual([{ id: 'usr-001', name: 'Ana Beatriz Souza' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    // URL is configured via import.meta.env.VITE_TURSO_URL; may be empty in tests
    expect(typeof url).toBe('string');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    // Wire format must match the Turso HTTP API: statements[].q + params
    const sent = JSON.parse(init.body);
    expect(sent.statements).toEqual([{ q: 'SELECT id, name FROM users WHERE id = ?', params: ['usr-001'] }]);
  });

  it('normalises libsql:// URLs to https://', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([{ results: { columns: ['x'], rows: [[1]], rows_affected: 0 } }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    // Force a libsql URL so httpUrl() has something to convert
    vi.stubEnv('VITE_TURSO_URL', 'libsql://pponto-felipeumbra.aws-ap-northeast-1.turso.io');
    vi.resetModules();

    const { tursoQuery } = await import('./turso-client.js');
    await tursoQuery('SELECT 1');
    const [url] = mockFetch.mock.calls[0];
    expect(String(url)).toBe('https://pponto-felipeumbra.aws-ap-northeast-1.turso.io');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      new Response('error', { status: 500 }),
    );

    const { tursoQuery } = await import('./turso-client.js');
    await expect(tursoQuery('SELECT 1')).rejects.toThrow('Turso query failed');
  });

  it('throws when a result item reports a server-side error', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify([{ error: 'table users does not exist' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { tursoQuery } = await import('./turso-client.js');
    await expect(tursoQuery('SELECT * FROM missing')).rejects.toThrow('table users does not exist');
  });

  it('executes a write statement and reports rows_affected', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([{ results: { columns: [], rows: [], rows_affected: 1 } }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { tursoExecute } = await import('./turso-client.js');
    const res = await tursoExecute(
      'INSERT INTO users (id, cpf, name, role) VALUES (?, ?, ?, ?)',
      ['usr-999', '000.000.000-00', 'Test', 'employee'],
    );
    expect(res.rows_affected).toBe(1);
    const sent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sent.statements[0].q).toContain('INSERT INTO users');
    expect(sent.statements[0].params).toEqual(['usr-999', '000.000.000-00', 'Test', 'employee']);
  });

  it('batches multiple statements and returns one result per statement', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          { results: { columns: ['cnt'], rows: [[5]], rows_affected: 0 } },
          { results: { columns: [], rows: [], rows_affected: 1 } },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { tursoBatch } = await import('./turso-client.js');
    const results = await tursoBatch([
      { sql: 'SELECT COUNT(*) AS cnt FROM users' },
      { sql: 'UPDATE users SET pin_hash = ? WHERE id = ?', args: ['1234', 'usr-001'] },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].rows).toEqual([{ cnt: 5 }]);
    expect(results[1].rows_affected).toBe(1);
    const [, init] = mockFetch.mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(sent.statements).toHaveLength(2);
    expect(sent.statements[1]).toEqual({ q: 'UPDATE users SET pin_hash = ? WHERE id = ?', params: ['1234', 'usr-001'] });
  });
});