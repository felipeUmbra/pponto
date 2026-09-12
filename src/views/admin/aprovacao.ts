/**
 * Aprovação de Ajustes — admin punch-correction review workflow.
 * Matches Stitch screen #09 design (master-detail queue).
 */
import {
  listPendingAdjustments,
  listAdminUsers,
  reviewAdjustment,
} from '../../api/data.js';
import type { AdjustmentRequest } from '../../types.js';
import { getCurrentUser } from '../../core/store.js';

import { createAdminPageSkeleton } from '../../components/skeleton.js';
import { createEmptyState } from '../../components/empty-state.js';

export async function renderAprovacao(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  // Show skeleton while loading
  el.appendChild(createAdminPageSkeleton());

  try {
    const [adjustments, users] = await Promise.all([listPendingAdjustments(), listAdminUsers()]);
    const userById = new Map(users.map((u) => [u.user.id, u.user]));
    el.innerHTML = '';

    // Header
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm';
    header.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Aprovação de Ajustes</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-vibrant/10 text-blue-vibrant border border-blue-vibrant/20">${adjustments.length} pendentes</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">Solicitações de correção de marcação de ponto aguardando deliberação.</p>
      </div>`;
    el.appendChild(header);

    // Queue grid (master-detail cards)
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 xl:grid-cols-2 gap-4';
    const badge = header.querySelector<HTMLSpanElement>('.inline-flex');

    if (adjustments.length === 0) {
      grid.appendChild(createEmptyState({
        icon: 'edit_calendar',
        title: 'Nenhum ajuste pendente',
        subtitle: 'Todos os ajustes estão em dia 🎉',
        className: 'col-span-full',
      }));
    } else {
      for (const a of adjustments) {
        const emp = userById.get(a.user_id);
        grid.appendChild(renderCard(a, emp?.name ?? 'Colaborador', emp?.department_id ?? '', badge));
      }
    }

    el.appendChild(grid);
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderCard(
  a: AdjustmentRequest,
  empName: string,
  dept: string,
  badge: HTMLSpanElement | null,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'p-4 rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm flex flex-col gap-3 hover:border-blue-accent/40 transition-all';
  card.dataset.id = a.id;

  const correctionLabel = a.requested_exit
    ? `Inclusão de Saída ${a.requested_exit}`
    : a.requested_entry
      ? `Inclusão de Entrada ${a.requested_entry}`
      : 'Correção de Marcação';

  card.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full bg-blue-vibrant flex items-center justify-center text-white font-bold text-xs">${empName.charAt(0)}</div>
        <div>
          <div class="text-body-sm font-semibold text-on-surface leading-snug">${empName}</div>
          <div class="text-caption text-outline">${dept || '—'}</div>
        </div>
      </div>
      <span class="px-2 py-0.5 rounded-full text-caption font-bold bg-amber-soft/15 text-amber-warning uppercase tracking-wide">Pendente</span>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <span class="px-2 py-1 rounded bg-neutral-canvas border border-border-subtle text-caption font-medium text-secondary flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">edit_calendar</span>${correctionLabel}
      </span>
      <span class="text-caption text-outline font-tabular-time">${a.punch_date}</span>
    </div>

    <p class="text-body-sm text-on-surface-variant italic line-clamp-2">"${a.reason}"</p>

    <div class="text-caption text-outline flex items-center justify-between pt-1 border-t border-border-subtle">
      <span class="flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">schedule</span>Enviado ${new Date(a.created_at).toLocaleDateString('pt-BR')}
      </span>
    </div>

    <div class="mt-auto grid grid-cols-2 gap-2 pt-1">
      <button class="py-1.5 px-3 bg-emerald-light hover:bg-teal-success text-surface-container-lowest rounded text-caption font-semibold flex items-center justify-center space-x-1 transition-colors btn-approve" data-id="${a.id}">
        <span class="material-symbols-outlined text-sm">check</span><span>Aprovar</span>
      </button>
      <button class="py-1.5 px-3 bg-surface-container-lowest hover:bg-neutral-canvas border border-border-subtle text-ruby-danger rounded text-caption font-medium flex items-center justify-center space-x-1 transition-colors btn-reject" data-id="${a.id}">
        <span class="material-symbols-outlined text-sm">close</span><span>Rejeitar</span>
      </button>
    </div>`;

  const reviewer = getCurrentUser();
  const approveBtn = card.querySelector<HTMLButtonElement>('.btn-approve')!;
  const rejectBtn = card.querySelector<HTMLButtonElement>('.btn-reject')!;

  const doReview = async (status: 'approved' | 'rejected'): Promise<void> => {
    try {
      await reviewAdjustment(a.id, status, reviewer?.id ?? 'admin');
      // Decrement header badge
      if (badge) {
        const current = parseInt(badge.textContent ?? '0', 10);
        badge.textContent = `${Math.max(0, current - 1)} pendentes`;
      }
      card.classList.add('opacity-50', 'pointer-events-none');
      card.style.transition = 'opacity .3s';
      const badgeSpan = card.querySelector<HTMLSpanElement>('span.text-amber-warning')!;
      badgeSpan.textContent = status === 'approved' ? 'Aprovado ✓' : 'Rejeitado ✗';
      badgeSpan.className = status === 'approved'
        ? 'px-2 py-0.5 rounded-full text-caption font-bold bg-emerald-light/15 text-teal-success uppercase tracking-wide'
        : 'px-2 py-0.5 rounded-full text-caption font-bold bg-red-50 text-ruby-danger uppercase tracking-wide';
      setTimeout(() => card.remove(), 1200);
    } catch {
      /* keep card on failure */
    }
  };

  approveBtn.addEventListener('click', () => void doReview('approved'));
  rejectBtn.addEventListener('click', () => void doReview('rejected'));

  return card;
}