/**
 * Lightweight hash router for the Ponto Dot8 SPA.
 * Supports: hash-based routing, route params, role-based guards, layout switching.
 */
import type { Route, MatchedRoute } from './types.js';
import { getCurrentUser } from './core/store.js';

// ─── Route Table ────────────────────────────────────────────

export const ROUTES: Route[] = [
  // Public
  { name: 'login', path: '/login', roles: [], layout: 'none' },

  // Employee mobile
  { name: 'ponto', path: '/ponto', roles: ['employee', 'manager', 'admin', 'rh'], layout: 'mobile' },
  { name: 'espelho', path: '/espelho', roles: ['employee', 'manager', 'admin', 'rh'], layout: 'mobile' },
  { name: 'solicitacoes', path: '/solicitacoes', roles: ['employee', 'manager', 'admin', 'rh'], layout: 'mobile' },
  { name: 'ajuste', path: '/ajuste', roles: ['employee', 'manager', 'admin', 'rh'], layout: 'mobile' },

  // Admin desktop
  { name: 'admin', path: '/admin', roles: ['admin', 'rh', 'manager'], layout: 'admin' },
  { name: 'admin-tratamento', path: '/admin/tratamento', roles: ['admin', 'rh', 'manager'], layout: 'admin' },
  { name: 'admin-homologacao', path: '/admin/homologacao', roles: ['admin', 'rh'], layout: 'admin' },
  { name: 'admin-aprovacao', path: '/admin/aprovacao', roles: ['admin', 'rh', 'manager'], layout: 'admin' },
  { name: 'admin-relatorios', path: '/admin/relatorios', roles: ['admin', 'rh', 'manager'], layout: 'admin' },
  { name: 'admin-fechamento', path: '/admin/fechamento', roles: ['admin', 'rh'], layout: 'admin' },
  { name: 'admin-cercas', path: '/admin/cercas', roles: ['admin', 'rh'], layout: 'admin' },
  { name: 'admin-configuracoes', path: '/admin/configuracoes', roles: ['admin'], layout: 'admin' },
];

// ─── Path matching ──────────────────────────────────────────

function matchRoute(hash: string): MatchedRoute | null {
  const path = hash.replace(/^#/, '') || '/login';

  // Exact match first
  for (const route of ROUTES) {
    if (path === route.path) {
      return { route, params: {} };
    }
  }

  // Prefix match (e.g. /admin/tratamento matches /admin)
  for (const route of ROUTES) {
    if (path.startsWith(route.path + '/') || (route.path === '/admin' && path.startsWith('/admin/'))) {
      return { route, params: {} };
    }
  }

  return null;
}

// ─── Router state ───────────────────────────────────────────

type RouteChangeCallback = (matched: MatchedRoute | null) => void;

let currentRoute: MatchedRoute | null = null;
const listeners: RouteChangeCallback[] = [];

/**
 * Subscribe to route changes.
 */
export function onRouteChange(cb: RouteChangeCallback): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Navigate to a hash route.
 */
export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

/**
 * Get the current matched route.
 */
export function getCurrentRoute(): MatchedRoute | null {
  return currentRoute;
}

/**
 * Initialize the router — call once on app start.
 */
export function initRouter(): void {
  const handleHashChange = (): void => {
    const hash = window.location.hash || '#/login';
    const matched = matchRoute(hash);

    if (!matched) {
      // 404 → redirect to login
      navigate('/login');
      return;
    }

    const user = getCurrentUser();

    // Auth guard: not logged in → redirect to login
    if (matched.route.name !== 'login' && !user) {
      navigate('/login');
      return;
    }

    // Logged in but at login page → redirect to appropriate home
    if (matched.route.name === 'login' && user) {
      const homePath = user.role === 'employee' ? '/ponto' : '/admin';
      navigate(homePath);
      return;
    }

    // Role guard
    if (matched.route.roles.length > 0 && user && !matched.route.roles.includes(user.role)) {
      const fallbackPath = user.role === 'employee' ? '/ponto' : '/admin';
      navigate(fallbackPath);
      return;
    }

    currentRoute = matched;
    listeners.forEach((cb) => cb(matched));
  };

  window.addEventListener('hashchange', handleHashChange);

  // Initial route
  handleHashChange();
}

/**
 * Destroy the router (for testing).
 */
export function destroyRouter(): void {
  window.removeEventListener('hashchange', () => { /* noop */ });
  listeners.length = 0;
  currentRoute = null;
}
