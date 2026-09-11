import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, getSession, clearSession, getCurrentUser, hasRole } from './store.js';
import type { Session, User } from '../types.js';

const user: User = {
  id: 'usr-001',
  company_id: 'comp-001',
  department_id: 'dept-001',
  cpf: '12345678900',
  name: 'Mariana Alencar',
  email: 'mariana@pponto.com',
  role: 'rh',
  created_at: '2024-01-01',
};

const session: Session = {
  user,
  token: 'token-123',
  login_at: '2024-10-24T10:00:00Z',
};

describe('store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves a session', () => {
    saveSession(session);
    expect(getSession()).toEqual(session);
  });

  it('returns null when no session', () => {
    expect(getSession()).toBeNull();
  });

  it('returns current user', () => {
    saveSession(session);
    expect(getCurrentUser()).toEqual(user);
  });

  it('clears the session', () => {
    saveSession(session);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it('hasRole checks role membership', () => {
    expect(hasRole(user, 'rh')).toBe(true);
    expect(hasRole(user, 'admin')).toBe(false);
    expect(hasRole(null, 'rh')).toBe(false);
  });

  it('tolerates corrupted storage', () => {
    localStorage.setItem('pponto:session', '{not valid json');
    expect(getSession()).toBeNull();
  });
});