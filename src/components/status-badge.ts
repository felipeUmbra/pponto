/**
 * Reusable status badge — echoes the Stitch pill-style badges.
 * Used across mobile & admin views (punch status, request status...).
 */
import type { AdjustmentStatus, CertificateStatus } from '../types.js';

type Status = AdjustmentStatus | CertificateStatus | 'running' | 'inconsistent' | 'approved';

interface StatusStyle {
  label: string;
  cls: string;
  dot?: string;
  icon?: string;
}

const STYLES: Record<Status, StatusStyle> = {
  pending: {
    label: 'Pendente',
    cls: 'bg-amber-warning/10 text-amber-warning border border-amber-warning/30',
    dot: 'bg-amber-warning',
  },
  approved: {
    label: 'Aprovado',
    cls: 'bg-emerald-light/15 text-teal-success border border-emerald-light/30',
    dot: 'bg-emerald-light',
  },
  rejected: {
    label: 'Rejeitado',
    cls: 'bg-ruby-danger/10 text-ruby-danger border border-ruby-danger/30',
    dot: 'bg-ruby-danger',
  },
  running: {
    label: 'Em andamento',
    cls: 'bg-blue-accent/10 text-blue-vibrant border border-blue-accent/30',
    dot: 'bg-blue-vibrant',
  },
  inconsistent: {
    label: 'Inconsistência',
    cls: 'bg-amber-warning/10 text-amber-warning border border-amber-warning/30',
    dot: 'bg-amber-warning',
  },
};

/**
 * Render a compact status pill.
 * `icon` overrides the dot when provided (Material Symbols name).
 */
export function renderStatusBadge(
  status: Status,
  customLabel?: string,
  icon?: string,
): HTMLElement {
  const s = STYLES[status] ?? STYLES.pending;
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center gap-1 text-badge-label uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${s.cls}`;
  badge.innerHTML = icon
    ? `<span class="material-symbols-outlined text-[13px]">${icon}</span>`
    : `<span class="w-1.5 h-1.5 rounded-full ${s.dot ?? ''}"></span>`;
  badge.appendChild(document.createTextNode(` ${customLabel ?? s.label}`));
  return badge;
}

/**
 * Full-width status bar used at the bottom of espelho day cards.
 */
export function renderStatusFooter(
  status: Status,
  chips: { icon: string; text: string }[] = [],
): HTMLElement {
  const foot = document.createElement('div');
  foot.className =
    'mt-2.5 pt-2 border-t border-border-subtle flex items-center justify-between';

  const chipWrap = document.createElement('div');
  chipWrap.className = 'flex items-center gap-2 text-teal-success text-caption';
  chipWrap.innerHTML = chips
    .map(
      (c) => `
      <span class="inline-flex items-center gap-1 bg-emerald-light/10 px-2 py-0.5 rounded">
        <span class="material-symbols-outlined text-[13px]">${c.icon}</span>
        ${c.text}
      </span>`,
    )
    .join('') || '<span></span>';
  foot.appendChild(chipWrap);

  const ok = status === 'approved' || status === 'running';
  const badge = renderStatusBadge(status);
  if (ok) {
    badge.classList.add('!text-teal-success');
  }
  foot.appendChild(badge);
  return foot;
}