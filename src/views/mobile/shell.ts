/**
 * Mobile layout shell — wraps content with top bar + bottom nav.
 * Matches the PWA mobile frame (max-w 420px centered).
 */
import type { RouteName } from '../../types.js';
import { renderMobileNav } from '../../components/mobile-nav.js';
import { getQueueCount } from '../../core/offline.js';

export function renderMobileShell(
  activeRoute: RouteName,
  headerTitle: string,
  content: HTMLElement,
): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'min-h-screen max-w-[420px] mx-auto bg-neutral-canvas flex flex-col relative pb-20 shadow-2xl';

  // Top app bar
  const header = document.createElement('header');
  header.className = 'sticky top-0 z-40 bg-navy-deep text-white px-4 py-3 shadow-md flex items-center justify-between';
  header.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="w-8 h-8 rounded-lg bg-blue-vibrant flex items-center justify-center text-white text-sm font-bold">pP</div>
      <div>
        <div class="flex items-center space-x-1.5">
          <span class="text-sm font-bold tracking-tight">pPonto</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-light"></span>
        </div>
        <p class="text-[10px] text-secondary-fixed">Portaria 671 MTE Homologado</p>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <div class="flex items-center space-x-1 bg-navy-surface px-2.5 py-1 rounded-full border border-white/10">
        <span class="w-2 h-2 rounded-full bg-emerald-light animate-pulse"></span>
        <span class="text-[11px] text-white font-medium" data-role="conn-pill">Online</span>
      </div>
      <button class="w-8 h-8 rounded-full bg-navy-surface flex items-center justify-center text-white hover:bg-blue-accent/20 transition-colors">
        <span class="material-symbols-outlined text-[18px]">help_outline</span>
      </button>
    </div>
  `;
  shell.appendChild(header);

  // Sync notice banner — pending count wired to IndexedDB queue
  const banner = document.createElement('div');
  banner.className = 'bg-surface-container-low px-4 py-1.5 border-b border-border-subtle flex items-center justify-between';
  banner.innerHTML = `
    <div class="flex items-center space-x-2">
      <span class="material-symbols-outlined text-amber-warning text-[16px]">cloud_done</span>
      <span class="text-[11px] text-on-surface font-medium" data-role="sync-banner">Cache criptografado ativo • calculando pendências…</span>
    </div>
    <span class="text-[11px] text-outline font-mono">REP-P v3.12</span>
  `;
  shell.appendChild(banner);

  // Title
  const titleBar = document.createElement('div');
  titleBar.className = 'px-4 pt-3 pb-1';
  titleBar.innerHTML = `<h1 class="text-headline-md font-bold text-on-surface">${headerTitle}</h1>`;
  shell.appendChild(titleBar);

  // Scrollable content
  const main = document.createElement('main');
  main.className = 'flex-1 px-4 pt-2 pb-4 space-y-3';
  main.appendChild(content);
  shell.appendChild(main);

  // Bottom nav
  shell.appendChild(renderMobileNav(activeRoute));

  // Keep the banner in sync with the offline queue (best-effort)
  const bannerEl = banner.querySelector<HTMLElement>('[data-role="sync-banner"]');
  const pillEl = header.querySelector<HTMLElement>('[data-role="conn-pill"]');
  void refreshBanner(bannerEl, pillEl);

  return shell;
}

async function refreshBanner(bannerEl: HTMLElement | null, pillEl: HTMLElement | null): Promise<void> {
  const update = async (): Promise<void> => {
    let pending: number;
    try {
      pending = await getQueueCount();
    } catch {
      pending = 0;
    }
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (bannerEl) {
      bannerEl.innerHTML = `Cache criptografado ativo • <strong>${pending} pendente${pending === 1 ? '' : 's'}</strong>`;
    }
    if (pillEl) {
      pillEl.textContent = online ? 'Online' : 'Offline';
      pillEl.className = `text-[11px] font-medium ${online ? 'text-white' : 'text-amber-soft'}`;
    }
  };
  // Initial + on reconnect
  window.addEventListener('online', () => void update());
  window.addEventListener('offline', () => void update());
  window.addEventListener('pponto:refresh', () => void update());
  await update();
}
