/**
 * Toast notification — reusable (extracted from the duplicated private
 * implementations in punch.ts / ponto-web.ts).
 */

export interface ToastOptions {
  /** Icon name (Material Symbols). Default: 'verified'. */
  icon?: string;
  /** Toast tone. Default: 'success' (emerald). */
  tone?: 'success' | 'warning' | 'danger' | 'offline';
  /** Auto-dismiss delay in ms. Default: 3200. */
  duration?: number;
}

const TONES: Record<NonNullable<ToastOptions['tone']>, { border: string; iconBg: string; iconColor: string }> = {
  success: { border: 'border-emerald-light/40', iconBg: 'bg-emerald-light/20', iconColor: 'text-emerald-light' },
  warning: { border: 'border-amber-soft/40', iconBg: 'bg-amber-soft/20', iconColor: 'text-amber-warning' },
  danger: { border: 'border-ruby-danger/40', iconBg: 'bg-ruby-danger/20', iconColor: 'text-ruby-danger' },
  offline: { border: 'border-blue-accent/40', iconBg: 'bg-blue-vibrant/20', iconColor: 'text-blue-accent' },
};

const DEFAULT_ICONS: Record<NonNullable<ToastOptions['tone']>, string> = {
  success: 'verified',
  warning: 'warning',
  danger: 'error',
  offline: 'cloud_off',
};

/**
 * Show a toast notification at the top-center of the viewport.
 */
export function showToast(
  title: string,
  message: string,
  options: ToastOptions = {},
): void {
  const tone = options.tone ?? 'success';
  const color = TONES[tone];
  const icon = options.icon ?? DEFAULT_ICONS[tone];
  const duration = options.duration ?? 3200;

  const toast = document.createElement('div');
  toast.className =
    `fixed top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-[390px] bg-navy-deep text-white ` +
    `p-3.5 rounded-2xl shadow-2xl border ${color.border} z-50 flex items-center space-x-3 transition-all duration-300`;
  toast.innerHTML = `
    <div class="w-10 h-10 rounded-full ${color.iconBg} flex items-center justify-center ${color.iconColor} shrink-0">
      <span class="material-symbols-outlined text-[24px]">${icon}</span>
    </div>
    <div class="flex-1">
      <h4 class="text-body-md font-semibold">${title}</h4>
      <p class="text-caption text-secondary-fixed">${message}</p>
    </div>
  `;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -16px)';
    window.setTimeout(() => toast.remove(), 400);
  }, duration);
}