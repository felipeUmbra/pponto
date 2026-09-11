import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock turso + store before importing auth
const mocks = vi.hoisted(() => ({
  tursoQuery: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('./turso-client.js', () => ({
  tursoQuery: mocks.tursoQuery,
}));
vi.mock('./store.js', () => ({
  saveSession: mocks.saveSession,
  clearSession: mocks.clearSession,
  getCurrentUser: mocks.getCurrentUser,
}));
// Force Turso mode on (otherwise auth would use the demo dataset)
vi.mock('../api/data.js', async (importOriginal): Promise<typeof import('../api/data.js')> => {
  const actual = await importOriginal<typeof import('../api/data.js')>();
  return {
    ...actual,
    HAS_TURSO: true,
    isDemoMode: (): boolean => false,
    setDemoFallback: (): void => {},
  };
});

import { login, demoLogin, logout, isLoggedIn, requireAuth } from './auth.js';

describe('auth', () => {
  beforeEach(() => {
    mocks.tursoQuery.mockReset();
    mocks.saveSession.mockReset();
    mocks.clearSession.mockReset();
    mocks.getCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  const userRow = {
    id: 'usr-001',
    cpf: '12345678900',
    pin_hash: '1234',
    name: 'Mariana',
    email: 'm@dot8.com',
    role: 'rh',
    company_id: 'comp-001',
    department_id: 'dept-001',
  };

  it('logs in with correct CPF and PIN', async () => {
    mocks.tursoQuery.mockResolvedValue([userRow]);

    const session = await login('123.456.789-00', '1234');

    expect(session.user.name).toBe('Mariana');
    expect(session.token).toBeTruthy();
    expect(mocks.saveSession).toHaveBeenCalledWith(session);
  });

  it('throws on unknown CPF', async () => {
    mocks.tursoQuery.mockResolvedValue([]);
    await expect(login('000.000.000-00', '1234')).rejects.toThrow('Usuário não encontrado');
  });

  it('throws on wrong PIN', async () => {
    mocks.tursoQuery.mockResolvedValue([userRow]);
    await expect(login('123.456.789-00', '9999')).rejects.toThrow('PIN incorreto');
  });

  it('demoLogin authenticates by user id', async () => {
    mocks.tursoQuery.mockResolvedValue([userRow]);
    const session = await demoLogin('usr-001');
    expect(session.user.id).toBe('usr-001');
  });

  it('logout clears session', () => {
    logout();
    expect(mocks.clearSession).toHaveBeenCalled();
  });

  it('isLoggedIn checks current user', () => {
    mocks.getCurrentUser.mockReturnValue({ id: 'x' } as never);
    expect(isLoggedIn()).toBe(true);

    mocks.getCurrentUser.mockReturnValue(null);
    expect(isLoggedIn()).toBe(false);
  });

  it('requireAuth throws and redirects when unauthenticated', () => {
    mocks.getCurrentUser.mockReturnValue(null);
    expect(() => requireAuth()).toThrow('Autenticação necessária.');
  });

  it('requireAuth returns user when authenticated', () => {
    const u = { id: 'usr-001' } as never;
    mocks.getCurrentUser.mockReturnValue(u);
    expect(requireAuth()).toBe(u);
  });
});