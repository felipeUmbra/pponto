/**
 * Mobile bottom navigation bar — matches Stitch screen designs.
 */
import type { RouteName } from '../types.js';
import { navigate } from '../router.js';

interface NavItem {
  icon: string;
  label: string;
  route: RouteName;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'fingerprint', label: 'Ponto', route: 'ponto' },
  { icon: 'calendar_month', label: 'Espelho', route: 'espelho' },
  { icon: 'assignment', label: 'Solicitações', route: 'solicitacoes' },
  { icon: 'edit_note', label: 'Ajuste', route: 'ajuste' },
];

export function renderMobileNav(activeRoute: RouteName): HTMLElement {
  const nav = document.createElement('nav');
  nav.className =
    'fixed bottom-0 inset-x-0 z-50 bg-surface-container-lowest border-t border-border-subtle flex items-center justify-around px-2 py-1 safe-area-pb';

  for (const item of NAV_ITEMS) {
    const isActive = item.route === activeRoute;
    const btn = document.createElement('button');
    btn.className = `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
      isActive
        ? 'text-blue-vibrant bg-blue-vibrant/10'
        : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
    }`;
    btn.innerHTML = `
      <span class="material-symbols-outlined text-[22px]">${item.icon}</span>
      <span class="text-[10px] font-medium leading-tight">${item.label}</span>
    `;
    btn.addEventListener('click', () => navigate(`/${item.route}`));
    nav.appendChild(btn);
  }

  return nav;
}
