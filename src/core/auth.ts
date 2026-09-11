/**
 * Authentication module — PIN-based login against Turso.
 * On success, stores session in localStorage.
 * Falls back to the demo dataset when Turso credentials are absent.
 */
import { tursoQuery } from './turso-client.js';
import { saveSession, clearSession, getCurrentUser } from './store.js';
import { HAS_TURSO, isDemoMode, setDemoFallback } from '../api/data.js';
import type { Session, User } from '../types.js';

interface UserRow {
  id: string;
  cpf: string;
  pin_hash: string | null;
  name: string;
  email: string;
  role: string;
  company_id: string;
  department_id: string | null;
}

const DEMO_USERS: UserRow[] = [
  { id: 'usr-demo-1', cpf: '35470291012', pin_hash: '1234', name: 'Ana Beatriz Souza', email: 'ana.souza@pponto.dev', role: 'employee', company_id: 'cmp-001', department_id: 'dept-02' },
  { id: 'usr-demo-2', cpf: '82947215075', pin_hash: '1234', name: 'Rafael Mendes', email: 'rafael.mendes@pponto.dev', role: 'employee', company_id: 'cmp-001', department_id: 'dept-02' },
  { id: 'usr-demo-3', cpf: '11122233344', pin_hash: '1234', name: 'Carlos Medeiros', email: 'carlos.medeiros@pponto.dev', role: 'manager', company_id: 'cmp-001', department_id: 'dept-03' },
  { id: 'usr-demo-4', cpf: '55566677788', pin_hash: '1234', name: 'Mariana Alencar', email: 'mariana.alencar@pponto.dev', role: 'rh', company_id: 'cmp-001', department_id: 'dept-01' },
  { id: 'usr-demo-5', cpf: '99988877766', pin_hash: '1234', name: 'Pedro Augusto', email: 'pedro.augusto@pponto.dev', role: 'admin', company_id: 'cmp-001', department_id: 'dept-01' },
];

async function findUser(cpfOrId: string): Promise<UserRow> {
  if (HAS_TURSO && !isDemoMode()) {
    try {
      const where = cpfOrId.length === 11 ? 'cpf = ?' : 'id = ?';
      const users = await tursoQuery<UserRow>(
        `SELECT id, cpf, pin_hash, name, email, role, company_id, department_id FROM users WHERE ${where} LIMIT 1`,
        [cpfOrId],
      );
      if (users.length === 0) throw new Error('Usuário não encontrado.');
      return users[0];
    } catch (err) {
      // Unauthorized / network — degrade to demo so the app stays usable
      setDemoFallback(true);
      const u = DEMO_USERS.find((x) => x.id === cpfOrId || x.cpf === cpfOrId);
      if (!u) throw err;
      return u;
    }
  }
  const u = DEMO_USERS.find((x) => x.id === cpfOrId || x.cpf === cpfOrId);
  if (!u) throw new Error('Usuário não encontrado.');
  return u;
}

function toSession(u: UserRow): Session {
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
