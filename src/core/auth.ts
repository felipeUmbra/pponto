/**
 * Authentication module — PIN-based login against Turso.
 * On success, stores session in localStorage.
 * Falls back to the demo dataset when Turso credentials are absent.
 */
import { tursoQuery } from './turso-client.js';
import { saveSession, clearSession, getCurrentUser } from './store.js';
import { HAS_TURSO, isDemoMode, setDemoFallback, findDemoUser, type DemoAuthUser } from '../api/data.js';
import type { Session, User } from '../types.js';

async function findUser(cpfOrId: string): Promise<DemoAuthUser> {
  if (HAS_TURSO && !isDemoMode()) {
    try {
      const where = cpfOrId.length === 11 ? 'cpf = ?' : 'id = ?';
      const users = await tursoQuery<DemoAuthUser>(
        `SELECT id, cpf, pin_hash, name, email, role, company_id, department_id FROM users WHERE ${where} LIMIT 1`,
        [cpfOrId],
      );
      if (users.length === 0) throw new Error('Usuário não encontrado.');
      return users[0];
    } catch (err) {
      // Unauthorized / network — degrade to demo so the app stays usable
      setDemoFallback(true);
      const u = findDemoUser(cpfOrId);
      if (!u) throw err;
      return u;
    }
  }
  const u = findDemoUser(cpfOrId);
  if (!u) throw new Error('Usuário não encontrado.');
  return u;
}

function toSession(u: DemoAuthUser): Session {
  return {
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
}

/**
 * Attempt login with CPF + PIN.
 * Returns the session on success, or throws on failure.
 */
export async function login(cpf: string, pin: string): Promise<Session> {
  // Normalize CPF: strip dots and dashes
  const cleanCpf = cpf.replace(/[.-]/g, '');
  const u = await findUser(cleanCpf);

  // Simple pin comparison (in production, use bcrypt)
  if (u.pin_hash !== pin) {
    throw new Error('PIN incorreto.');
  }

  const session = toSession(u);
  saveSession(session);
  return session;
}

/**
 * Quick login for demo: select a user by ID (no PIN required).
 * Useful for development / seeding.
 */
export async function demoLogin(userId: string): Promise<Session> {
  const u = await findUser(userId);
  const session = toSession(u);
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
