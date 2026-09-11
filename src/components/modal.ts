/**
 * Modal dialog — promise-based confirmation/alert.
 * Listed in the plan's file tree; used by the fechamento & configuracoes views.
 */

export interface ModalOptions {
  title: string;
  message?: string;
  /** HTML body content (already-escaped where necessary). */
  bodyHtml?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ModalResult {
  confirmed: boolean;
}

/**
 * Show a modal and resolve with the user's choice.
 */
export function showModal(opts: ModalOptions): Promise<ModalResult> {
  return new Promise((resolve) => {
    const confirmLabel = opts.confirmLabel ?? (opts.danger ? 'Confirmar' : 'Salvar');
    const cancelLabel = opts.cancelLabel ?? 'Cancelar';

    const backdrop = document.createElement('div');
    backdrop.className =
      'fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200';

    const panel = document.createElement('div');
    panel.className =
      'bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md border border-border-subtle overflow-hidden transition-transform duration-200 scale-95';
    panel.innerHTML = `
      <div class="p-5 border-b border-border-subtle">
        <h3 class="text-headline-sm font-bold text-on-surface">${opts.title}</h3>
      </div>
      <div class="p-5">
        ${opts.bodyHtml ?? (opts.message ? `<p class="text-body-md text-on-surface-variant">${opts.message}</p>` : '')}
      </div>
      <div class="p-4 border-t border-border-subtle flex justify-end space-x-2 bg-neutral-canvas">
        <button class="px-4 py-2 rounded-lg border border-border-subtle text-on-surface text-body-sm font-medium hover:bg-surface-container-low transition-colors btn-cancel">${cancelLabel}</button>
        <button class="px-4 py-2 rounded-lg ${opts.danger ? 'bg-ruby-danger hover:bg-ruby-danger/90' : 'bg-blue-vibrant hover:bg-secondary'} text-white text-body-sm font-semibold transition-colors shadow-sm btn-confirm">${confirmLabel}</button>
      </div>
    `;

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    // Entrance animation
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      panel.style.transform = 'scale(1)';
    });

    const close = (confirmed: boolean): void => {
      backdrop.style.transition = 'opacity .15s';
      backdrop.style.opacity = '0';
      panel.style.transform = 'scale(.95)';
      window.setTimeout(() => backdrop.remove(), 150);
      resolve({ confirmed });
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    panel.querySelector('.btn-cancel')?.addEventListener('click', () => close(false));
    panel.querySelector('.btn-confirm')?.addEventListener('click', () => close(true));
  });
}