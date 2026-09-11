/**
 * Admin sidebar navigation — matches Stitch screen #01 design.
 * Navy sidebar with brand, nav links, and compliance pill.
 */
import type { RouteName } from '../types.js';
import { navigate } from '../router.js';
import { getCurrentUser, clearSession } from '../core/store.js';
import { getAdminStats, listPendingCertificates, listPendingAdjustments } from '../api/data.js';

interface SidebarLink {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  badgeColor?: string;
}

const LINKS: SidebarLink[] = [
  { icon: 'dashboard', label: 'Dashboard', route: '/admin' },
  { icon: 'fingerprint', label: 'Registrar Ponto Web', route: '/admin/ponto-web' },
  { icon: 'how_to_reg', label: 'Tratamento de Ponto', route: '/admin/tratamento' },
  { icon: 'calendar_month', label: 'Espelho de Ponto', route: '/admin/tratamento' },
  { icon: 'medical_services', label: 'Homologação de Atestados', route: '/admin/homologacao' },
  { icon: 'rule', label: 'Aprovação de Ajustes', route: '/admin/aprovacao' },
  { icon: 'query_stats', label: 'Relatórios & Banco de Horas', route: '/admin/relatorios' },
  { icon: 'receipt_long', label: 'Fechamento de Folha', route: '/admin/fechamento' },
  { icon: 'map', label: 'Cercas Virtuais', route: '/admin/cercas' },
  { icon: 'cloud_off', label: 'Contingência Offline', route: '/admin/offline' },
  { icon: 'settings', label: 'Configurações', route: '/admin/configuracoes' },
];

export function renderSideNav(activeRoute: RouteName): HTMLElement {
  const user = getCurrentUser();

  const aside = document.createElement('aside');
  aside.className =
    'w-64 bg-navy-surface border-r border-navy-deep flex flex-col justify-between h-screen p-4 flex-shrink-0 z-30 select-none';

  const top = document.createElement('div');
  top.className = 'flex flex-col space-y-6';

  // Brand
  top.innerHTML = `
    <div class="flex items-center space-x-3 px-2 py-1">
      <div class="w-10 h-10 rounded-xl bg-blue-vibrant flex items-center justify-center text-white shadow-sm flex-shrink-0">
        <span class="material-symbols-outlined text-white">fingerprint</span>
      </div>
      <div class="flex flex-col min-w-0">
        <span class="text-body-sm font-semibold text-white tracking-tight truncate">pPonto Gestão</span>
        <span class="text-[11px] text-outline-variant truncate">${user?.role === 'admin' ? 'Administrador' : user?.role === 'rh' ? 'Gestora RH' : 'Gestor'}</span>
      </div>
    </div>
  `;

  // Quick punch CTA
  const ctaBtn = document.createElement('button');
  ctaBtn.className =
    'w-full py-2.5 px-3 bg-blue-vibrant hover:bg-secondary text-white rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm';
  ctaBtn.innerHTML = '<span class="material-symbols-outlined">schedule</span><span class="text-sm font-medium">Registrar Ponto Web</span>';
  ctaBtn.addEventListener('click', () => navigate('/admin/ponto-web'));
  top.appendChild(ctaBtn);

  // Nav links
  const nav = document.createElement('nav');
  nav.className = 'flex flex-col space-y-1';

  for (const link of LINKS) {
    const isActive = link.route === `/${activeRoute}` || (activeRoute === 'admin' && link.route === '/admin');
    const a = document.createElement('a');
    a.href = `#${link.route}`;
    a.className = `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
      isActive
        ? 'text-white border-l-4 border-blue-accent bg-navy-deep font-semibold'
        : 'text-outline-variant hover:text-white hover:bg-navy-deep'
    }`;
    a.innerHTML = `
      <span class="material-symbols-outlined${isActive ? ' text-blue-accent' : ''}">${link.icon}</span>
      <span class="text-sm flex-1">${link.label}</span>
      <span class="badge-slot" data-route="${link.route}"></span>
    `;
    nav.appendChild(a);
  }

  top.appendChild(nav);

  // Wire live badges (best-effort; no badge if data fails)
  void wireBadges(nav);
  aside.appendChild(top);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'pt-4 border-t border-navy-deep flex flex-col space-y-2';
  footer.innerHTML = `
    <div class="p-2.5 rounded-lg bg-navy-deep/70 border border-slate-700/50 flex flex-col space-y-1">
      <div class="flex items-center space-x-1.5 text-tertiary-fixed">
        <span class="material-symbols-outlined text-sm">cloud_done</span>
        <span class="text-[11px] font-semibold">Portaria 671 MTE</span>
      </div>
      <p class="text-[11px] text-outline-variant leading-tight">REP-P Nuvem &amp; SHA-256 ativo</p>
    </div>
  `;

  const logoutBtn = document.createElement('a');
  logoutBtn.href = '#/login';
  logoutBtn.className =
    'flex items-center space-x-3 px-3 py-2 rounded-lg text-outline-variant hover:text-ruby-danger hover:bg-navy-deep transition-colors text-sm';
  logoutBtn.innerHTML = '<span class="material-symbols-outlined">logout</span><span>Encerrar Sessão</span>';
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    navigate('/login');
  });
  footer.appendChild(logoutBtn);
  aside.appendChild(footer);

  return aside;
}

/**
 * Fetch live pending counts and render badges on the matching nav links.
 * Renders nothing on failure (hermetic: no crash in tests/demo mode).
 */
async function wireBadges(nav: HTMLElement): Promise<void> {
  try {
    const [stats, certificates, adjustments] = await Promise.all([
      getAdminStats(),
      listPendingCertificates(),
      listPendingAdjustments(),
    ]);
    const counts: Record<string, number> = {
      '/admin/tratamento': stats.inconsistencies,
      '/admin/homologacao': certificates.length,
      '/admin/aprovacao': adjustments.length,
    };
    const colors: Record<string, string> = {
      '/admin/tratamento': 'bg-ruby-danger',
      '/admin/homologacao': 'bg-amber-soft',
      '/admin/aprovacao': 'bg-blue-vibrant',
    };
    nav.querySelectorAll<HTMLElement>('.badge-slot').forEach((slot) => {
      const route = slot.dataset.route ?? '';
      const value = counts[route];
      if (value === undefined || value <= 0) return;
      const color = colors[route] ?? 'bg-ruby-danger';
      slot.innerHTML = `<span class="inline-flex ml-auto ${color} text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold">${value}</span>`;
    });
  } catch {
    // Demo/offline failure — leave badges empty
  }
}
