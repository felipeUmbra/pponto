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
  it('executes a query and returns rows', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ columns: ['id'], rows: [{ id: 'usr-001' }], rows_affected: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { tursoQuery } = await import('./turso-client.js');
    const rows = await tursoQuery('SELECT id FROM users WHERE id = ?', ['usr-001']);

    expect(rows).toEqual([{ id: 'usr-001' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    // URL is configured via import.meta.env.VITE_TURSO_URL; may be empty in tests
    expect(typeof url).toBe('string');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      new Response('error', { status: 500 }),
    );

    const { tursoQuery } = await import('./turso-client.js');
    await expect(tursoQuery('SELECT 1')).rejects.toThrow('Turso query failed');
  });
});