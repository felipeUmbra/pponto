/**
 * Stat card — KPI metric tile used across admin dashboard & reports.
 * Matches the "bank hours bento tiles" design from the Stitch screens.
 */

export interface StatCardOptions {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  /** Tone maps to bg/icon color. Default: 'surface' (neutral). */
  tone?: 'surface' | 'purple' | 'emerald' | 'amber' | 'danger' | 'blue';
  /** Optional footer pill (HTML allowed, already-escaped content). */
  pill?: string;
  pillTone?: 'success' | 'warning' | 'danger' | 'neutral';
  pulse?: boolean;
}

const TONES: Record<NonNullable<StatCardOptions['tone']>, { iconBg: string; iconColor: string }> = {
  surface: { iconBg: 'bg-surface-container text-secondary', iconColor: 'text-secondary' },
  purple: { iconBg: 'bg-purple-subtle text-purple-bank', iconColor: 'text-purple-bank' },
  emerald: { iconBg: 'bg-emerald-light/10 text-teal-success', iconColor: 'text-teal-success' },
  amber: { iconBg: 'bg-amber-soft/10 text-amber-warning', iconColor: 'text-amber-warning' },
  danger: { iconBg: 'bg-error-container text-ruby-danger', iconColor: 'text-ruby-danger' },
  blue: { iconBg: 'bg-blue-50 text-blue-vibrant', iconColor: 'text-blue-vibrant' },
};

const PILL_TONES: Record<NonNullable<StatCardOptions['pillTone']>, string> = {
  success: 'bg-emerald-light/10 text-teal-success',
  warning: 'bg-amber-soft/10 text-amber-warning',
  danger: 'bg-error-container text-ruby-danger',
  neutral: 'bg-surface-container text-secondary',
};

/**
 * Render a KPI card.
 */
export function renderStatCard(opts: StatCardOptions): HTMLElement {
  const tone = TONES[opts.tone ?? 'surface'];
  const card = document.createElement('div');
  card.className = 'bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm flex flex-col justify-between relative overflow-hidden';

  card.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex flex-col">
        <span class="text-caption uppercase font-semibold text-outline tracking-wider">${opts.label}</span>
        <span class="text-headline-sm font-bold text-on-surface font-tabular-time mt-1">${opts.value}</span>
      </div>
      <div class="w-9 h-9 rounded-lg ${tone.iconBg} flex items-center justify-center">
        <span class="material-symbols-outlined text-xl ${tone.iconColor}">${opts.icon}</span>
      </div>
    </div>
    ${opts.hint ? `<div class="mt-3 pt-3 border-t border-border-subtle flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-caption text-on-surface-variant">${opts.hint}</span>
        ${opts.pill ? `<span class="inline-flex items-center gap-1 text-badge-label px-2 py-0.5 rounded-full ${PILL_TONES[opts.pillTone ?? 'neutral']} font-semibold">${opts.pulse ? '<span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>' : ''}${opts.pill}</span>` : ''}
      </div>
    </div>` : ''}
  `;

  return card;
}