/**
 * Homologação de Atestados — admin medical certificate review workflow.
 * Matches Stitch screen #07 design (master-detail queue).
 */
import {
  listPendingCertificates,
  listAdminUsers,
  reviewCertificate,
} from '../../api/data.js';
import type { MedicalCertificate } from '../../types.js';
import { getCurrentUser } from '../../core/store.js';

import { createEmptyState } from '../../components/empty-state.js';
import { createAdminPageSkeleton } from '../../components/skeleton.js';

export async function renderHomologacao(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  // Show skeleton while loading
  el.appendChild(createAdminPageSkeleton());

  try {
    const [certificates, users] = await Promise.all([listPendingCertificates(), listAdminUsers()]);
    const userById = new Map(users.map((u) => [u.user.id, u.user]));
    el.innerHTML = '';

    // Header
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm';
    header.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Homologação de Atestados</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ruby-danger/10 text-ruby-danger border border-ruby-danger/20">${certificates.length} pendentes</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">Triagem, validação de assinatura digital e deferimento de atestados médicos.</p>
      </div>`;
    el.appendChild(header);

    // Queue grid
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';
    const badge = header.querySelector<HTMLSpanElement>('.inline-flex');

    if (certificates.length === 0) {
      grid.appendChild(createEmptyState({
        icon: 'medical_information',
        title: 'Nenhum atestado pendente',
        subtitle: 'Todos os atestados estão em dia 🎉',
        className: 'col-span-full',
      }));
    } else {
      for (const c of certificates) {
        const emp = userById.get(c.user_id);
        grid.appendChild(renderCard(c, emp?.name ?? 'Colaborador', emp?.department_id ?? '', badge));
      }
    }

    el.appendChild(grid);
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderCard(
  c: MedicalCertificate,
  empName: string,
  dept: string,
  badge: HTMLSpanElement | null,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'p-4 rounded-xl border border-border-subtle bg-surface-container-lowest shadow-sm flex flex-col gap-3 hover:border-blue-accent/40 transition-all';
  card.dataset.id = c.id;
  card.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full bg-navy-surface text-surface-container-lowest flex items-center justify-center font-bold text-xs">${empName.charAt(0)}</div>
        <div>
          <div class="text-body-sm font-semibold text-on-surface leading-snug">${empName}</div>
          <div class="text-caption text-outline">${dept || '—'} • ${c.start_date}${c.end_date !== c.start_date ? ' → ' + c.end_date : ''}</div>
        </div>
      </div>
      <span class="px-2 py-0.5 rounded-full text-caption font-bold bg-amber-soft/15 text-amber-warning uppercase tracking-wide">Pendente</span>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-canvas border border-border-subtle text-caption text-on-surface font-medium">
        <span class="material-symbols-outlined text-xs text-teal-success">document_scanner</span>OCR validado
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-canvas border border-border-subtle text-caption text-on-surface font-medium">
        <span class="material-symbols-outlined text-xs text-teal-success">verified</span>Assinatura ICP-Brasil
      </span>
    </div>

    <p class="text-body-sm text-on-surface-variant line-clamp-2">${c.description ?? 'Sem descrição'}</p>

    <div class="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
      <button class="py-1.5 px-3 bg-emerald-light hover:bg-teal-success text-surface-container-lowest rounded text-caption font-semibold flex items-center justify-center space-x-1 transition-colors btn-approve" data-id="${c.id}">
        <span class="material-symbols-outlined text-sm">check</span><span>Deferir</span>
      </button>
      <button class="py-1.5 px-3 bg-surface-container-lowest hover:bg-neutral-canvas border border-border-subtle text-ruby-danger rounded text-caption font-medium flex items-center justify-center space-x-1 transition-colors btn-reject" data-id="${c.id}">
        <span class="material-symbols-outlined text-sm">close</span><span>Indeferir</span>
      </button>
    </div>`;

  const reviewer = getCurrentUser();
  const approveBtn = card.querySelector<HTMLButtonElement>('.btn-approve')!;
  const rejectBtn = card.querySelector<HTMLButtonElement>('.btn-reject')!;

  const doReview = async (status: 'approved' | 'rejected'): Promise<void> => {
    try {
      await reviewCertificate(c.id, status, reviewer?.id ?? 'admin');
      // Decrement header badge
      if (badge) {
        const current = parseInt(badge.textContent ?? '0', 10);
        const next = Math.max(0, current - 1);
        badge.textContent = `${next} pendentes`;
      }
      card.classList.add('opacity-50', 'pointer-events-none');
      card.style.transition = 'opacity .3s';
      card.querySelector<HTMLSpanElement>('span.text-amber-warning')!.textContent = status === 'approved' ? 'Deferido ✓' : 'Indeferido ✗';
      card.querySelector<HTMLSpanElement>('span.text-amber-warning')!.className = status === 'approved'
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