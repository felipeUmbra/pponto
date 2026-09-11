/**
 * Solicitações view — atestados médicos + ajustes de ponto.
 * Two pill tabs: Atestados | Ajustes. Each lists cards with status badges.
 */
import { requireAuth } from '../../core/auth.js';
import { navigate } from '../../router.js';
import { getCertificates, getAdjustments } from '../../api/data.js';
import type { MedicalCertificate as Cert, AdjustmentRequest as Adj } from '../../types.js';
import { esc } from '../../utils/dom.js';
import { renderStatusBadge } from '../../components/status-badge.js';

type Tab = 'certificates' | 'adjustments';

export function renderSolicitacoes(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-3.5';
  el.innerHTML = `
    <div class="text-center py-6 text-outline text-body-sm">
      <span class="material-symbols-outlined animate-spin inline-block">progress_activity</span>
      Carregando solicitações...
    </div>
  `;
  void initSolicitacoes(el);
  return el;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function certCard(c: Cert): string {
  const badge = renderStatusBadge(c.status).outerHTML;
  return `
    <article class="bg-surface-container-lowest rounded-xl border border-border-subtle p-3.5 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg bg-purple-subtle text-purple-bank flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[20px]">medical_information</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-body-md font-semibold text-navy-deep truncate">${esc(c.description ?? 'Atestado médico')}</h3>
            ${badge}
          </div>
          <p class="text-caption text-on-surface-variant mt-0.5">
            Enviado em ${fmtDate(c.uploaded_at)}
          </p>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-badge-label bg-surface-container-low text-secondary px-2 py-0.5 rounded font-medium">
              ${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function adjCard(a: Adj): string {
  const badge = renderStatusBadge(a.status).outerHTML;
  const target = a.requested_exit ? `Saída às ${a.requested_exit}` : a.requested_entry ? `Entrada às ${a.requested_entry}` : 'Batida';
  return `
    <article class="bg-surface-container-lowest rounded-xl border border-border-subtle p-3.5 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-soft/15 text-amber-warning flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[20px]">edit_calendar</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-body-md font-semibold text-navy-deep">${esc(target)}</h3>
            ${badge}
          </div>
          <p class="text-caption text-on-surface-variant mt-0.5">
            Dia ${fmtDate(a.punch_date)} • Solicitado em ${fmtDate(a.created_at)}
          </p>
          <p class="text-caption text-on-surface-variant mt-1.5 leading-snug italic">
            "${esc(a.reason)}"
          </p>
          ${a.review_notes && a.status !== 'pending' ? `<p class="text-caption text-teal-success mt-1.5"><span class="material-symbols-outlined text-[13px] align-middle">verified</span> ${esc(a.review_notes)}</p>` : ''}
        </div>
      </div>
    </article>
  `;
}

async function initSolicitacoes(root: HTMLElement): Promise<void> {
  const user = requireAuth();
  let tab: Tab = 'certificates';

  root.innerHTML = `
    <div class="space-y-3.5" data-role="region">
      <div class="text-center py-6 text-outline text-body-sm">Carregando...</div>
    </div>
    <div class="pt-2">
      <button class="w-full h-12 rounded-xl bg-blue-vibrant hover:bg-secondary text-white font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all" data-role="attach-btn">
        <span class="material-symbols-outlined text-[20px]">add_a_photo</span>
        Anexar Novo Atestado
      </button>
    </div>
  `;

  root.querySelector<HTMLButtonElement>('[data-role="attach-btn"]')?.addEventListener('click', () => navigate('/ajuste'));

  const region = root.querySelector<HTMLElement>('[data-role="region"]');
  if (!region) return;

  const render = async (): Promise<void> => {
    const [certs, adjs] = await Promise.all([getCertificates(user.id), getAdjustments(user.id)]);

    const tabs = `
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button class="px-3.5 py-1.5 rounded-full whitespace-nowrap text-body-sm font-medium transition-colors ${tab === 'certificates' ? 'bg-navy-deep text-white shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant border border-border-subtle'}" data-role="tab" data-tab="certificates">
          Atestados (${certs.length})
        </button>
        <button class="px-3.5 py-1.5 rounded-full whitespace-nowrap text-body-sm font-medium transition-colors ${tab === 'adjustments' ? 'bg-navy-deep text-white shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant border border-border-subtle'}" data-role="tab" data-tab="adjustments">
          Ajustes de Ponto (${adjs.length})
        </button>
      </div>
    `;

    const body =
      tab === 'certificates'
        ? certs.length
          ? certs.map(certCard).join('')
          : '<div class="text-center py-8 text-outline text-caption">Nenhum atestado cadastrado.</div>'
        : adjs.length
          ? adjs.map(adjCard).join('')
          : '<div class="text-center py-8 text-outline text-caption">Nenhum ajuste solicitado.</div>';

    region.innerHTML = `${tabs}<section class="space-y-3">${body}</section>`;

    region.querySelectorAll<HTMLButtonElement>('[data-role="tab"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = (btn.dataset.tab as Tab) ?? 'certificates';
        void render();
      });
    });
  };

  await render();
}
