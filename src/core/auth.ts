/**
 * Authentication module — PIN-based login against Turso.
 * On success, stores session in localStorage.
 */
import { tursoQuery } from './turso-client.js';
import { saveSession, clearSession, getCurrentUser } from './store.js';
import type { Session, User } from '../types.js';

/**
 * Attempt login with CPF + PIN.
 * Returns the session on success, or throws on failure.
 */
export async function login(cpf: string, pin: string): Promise<Session> {
  // Normalize CPF: strip dots and dashes
  const cleanCpf = cpf.replace(/[.-]/g, '');

  const users = await tursoQuery<{ id: string; cpf: string; pin_hash: string; name: string; email: string; role: string; company_id: string; department_id: string | null }>(
    'SELECT id, cpf, pin_hash, name, email, role, company_id, department_id FROM users WHERE cpf = ?',
    [cleanCpf],
  );

  if (users.length === 0) {
    throw new Error('CPF não encontrado.');
  }

  const user = users[0];

  // Simple pin comparison (in production, use bcrypt)
  if (user.pin_hash !== pin) {
    throw new Error('PIN incorreto.');
  }

  const session: Session = {
    user: {
      id: user.id,
      company_id: user.company_id,
      department_id: user.department_id,
      cpf: user.cpf,
      name: user.name,
      email: user.email,
      role: user.role as User['role'],
      created_at: '',
    },
    token: crypto.randomUUID(),
    login_at: new Date().toISOString(),
  };

  saveSession(session);
  return session;
}

/**
 * Quick login for demo: select a user by ID (no PIN required).
 * Useful for development / seeding.
 */
export async function demoLogin(userId: string): Promise<Session> {
  const users = await tursoQuery<{ id: string; cpf: string; name: string; email: string; role: string; company_id: string; department_id: string | null }>(
    'SELECT id, cpf, name, email, role, company_id, department_id FROM users WHERE id = ?',
    [userId],
  );

  if (users.length === 0) {
    throw new Error('Usuário não encontrado.');
  }

  const u = users[0];
  const session: Session = {
    user: {
      id: u.id,
      company_id: u.company_id,
      department_id: u.department_id,
      cpf: u.cpf,
      name: u.name,
      email: u.email,
      role: u.role as User['role'],
      created_at: '',
    },
    token: crypto.randomUUID(),
    login_at: new Date().toISOString(),
  };

  saveSession(session);
  return session;
}

/**
 * Logout — clear session.
 */
export function logout(): void {
  clearSession();
}

/**
 * Check if the current user is logged in.
 */
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Get the current user or redirect to login.
 */
export function requireAuth(): User {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = '#/login';
    throw new Error('Autenticação necessária.');
  }
  return user;
}
