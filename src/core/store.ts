/**
 * Client-side session store using localStorage.
 * Stores the current user session and provides helpers.
 */
import { CONFIG } from '../config.js';
import type { Session, User } from '../types.js';

const KEY = CONFIG.LS_SESSION;

/**
 * Save a session to localStorage.
 */
export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // storage full or private browsing — silently fail
  }
}

/**
 * Retrieve the current session, or null if not logged in.
 */
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/**
 * Get the current user, or null.
 */
export function getCurrentUser(): User | null {
  return getSession()?.user ?? null;
}

/**
 * Clear the session (logout).
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if user has a specific role.
 */
export function hasRole(user: User | null, ...roles: string[]): boolean {
  return user !== null && roles.includes(user.role);
}
