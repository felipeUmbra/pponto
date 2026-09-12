/**
 * Admin top navigation bar — matches Stitch screen #01 design.
 */
import { getCurrentUser } from '../core/store.js';

export function renderTopBar(title: string): HTMLElement {
  const user = getCurrentUser();

  const header = document.createElement('header');
  header.className =
    'bg-surface-container-lowest border-b border-border-subtle shadow-sm flex justify-between items-center w-full px-6 py-3 flex-shrink-0 z-20';

  header.innerHTML = `
    <div class="flex items-center space-x-6">
      <span class="text-headline-md font-bold tracking-tight text-on-surface">pPonto</span>
      <div class="relative w-80">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" aria-hidden="true">search</span>
        <input
          class="w-full pl-9 pr-4 py-1.5 text-sm bg-neutral-canvas border border-border-subtle rounded-lg focus:outline-none focus:border-blue-vibrant focus:ring-1 focus:ring-blue-vibrant placeholder-outline"
          placeholder="Buscar colaborador por nome, CPF ou PIS..."
          type="text"
          aria-label="Buscar colaborador"
        />
      </div>
      <nav class="hidden lg:flex items-center space-x-5 text-sm">
        <span class="text-on-surface font-semibold border-b-2 border-secondary pb-1">${title}</span>
      </nav>
    </div>
    <div class="flex items-center space-x-4">
      <div class="hidden sm:flex items-center space-x-2 bg-neutral-canvas border border-border-subtle px-3 py-1.5 rounded-lg">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-light animate-pulse"></span>
        <span class="material-symbols-outlined text-outline text-base">cloud_done</span>
        <span class="text-[11px] font-medium text-on-surface">Nuvem Conectada</span>
      </div>
      <div class="flex items-center space-x-1 text-on-surface-variant">
        <button class="p-2 hover:bg-surface-container-low rounded-lg transition-colors relative" title="Notificações">
          <span class="material-symbols-outlined">notifications</span>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-ruby-danger rounded-full ring-2 ring-surface-container-lowest"></span>
        </button>
      </div>
      <div class="h-6 w-px bg-border-subtle"></div>
      <div class="flex items-center space-x-3 cursor-pointer pl-1">
        <div class="w-9 h-9 rounded-full bg-blue-vibrant flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-accent/20">
          ${user?.name?.charAt(0) ?? '?'}
        </div>
        <div class="hidden md:flex flex-col text-left">
          <span class="text-sm font-semibold text-on-surface">${user?.name ?? 'Usuário'}</span>
          <span class="text-[11px] text-outline">${user?.role === 'admin' ? 'Administrador' : user?.role === 'rh' ? 'Gestora de DP & Relações Trabalhistas' : 'Gestor'}</span>
        </div>
      </div>
    </div>
  `;

  return header;
}
