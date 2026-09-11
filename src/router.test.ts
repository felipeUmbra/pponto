import { describe, it, expect, beforeEach } from 'vitest';
import { ROUTES, getCurrentRoute } from './router.js';

describe('router', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('contains all expected routes', () => {
    const names = ROUTES.map((r) => r.name);
    expect(names).toContain('login');
    expect(names).toContain('ponto');
    expect(names).toContain('espelho');
    expect(names).toContain('solicitacoes');
    expect(names).toContain('ajuste');
    expect(names).toContain('admin');
    expect(names).toContain('admin-ponto-web');
    expect(names).toContain('admin-tratamento');
    expect(names).toContain('admin-homologacao');
    expect(names).toContain('admin-aprovacao');
    expect(names).toContain('admin-relatorios');
    expect(names).toContain('admin-fechamento');
    expect(names).toContain('admin-cercas');
    expect(names).toContain('admin-configuracoes');
  });

  it('admin routes require role access', () => {
    const admin = ROUTES.find((r) => r.name === 'admin');
    expect(admin?.roles).toEqual(['admin', 'rh', 'manager']);

    const config = ROUTES.find((r) => r.name === 'admin-configuracoes');
    expect(config?.roles).toEqual(['admin']);
  });

  it('login is public', () => {
    const login = ROUTES.find((r) => r.name === 'login');
    expect(login?.roles).toEqual([]);
    expect(login?.layout).toBe('none');
  });

  it('starts with no current route until init', () => {
    expect(getCurrentRoute()).toBeNull();
  });
});