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
    btn.className = `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors focus-ring ${
      isActive
        ? 'text-blue-vibrant bg-blue-vibrant/10'
        : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
    }`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('aria-selected', isActive.toString());
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined text-[22px]';
    iconSpan.textContent = item.icon;
    iconSpan.setAttribute('aria-hidden', 'true');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'text-[10px] font-medium leading-tight';
    labelSpan.textContent = item.label;
    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);
    btn.addEventListener('click', () => navigate(`/${item.route}`));
    nav.appendChild(btn);
  }

  return nav;
}
