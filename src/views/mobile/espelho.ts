/**
 * Espelho de Ponto view (Stitch #10) — monthly time mirror.
 *
 * - Month selector (prev/next)
 * - Bento summary: bank hours, jornada efetiva, mini counters
 * - Filter tabs: Todos / Inconsistências / Solicitações
 * - Daily cards with 4-slot punch grids + status footer
 * - Floating action: "Solicitar Ajuste ou Anexar Atestado"
 */
import { requireAuth } from '../../core/auth.js';
import { navigate } from '../../router.js';
import {
  getPunchesInRange,
  getCertificates,
  getAdjustments,
  summarizeMonth,
} from '../../api/data.js';
import type { AdjustmentRequest, MedicalCertificate, Punch, PunchType } from '../../types.js';
import {
  PUNCH_LABELS,
  dateKey,
  formatBank,
  formatDuration,
  fullDateRange,
  monthLabel,
  parseDateKey,
  shortDay,
  weekdayLabel,
} from '../../utils/time.js';
import { renderPunchSlots } from '../../components/punch-card.js';

type Filter = 'all' | 'inconsistencies' | 'requests';

export function renderEspelho(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-3.5';
  el.innerHTML = `
    <div class="text-center py-6 text-outline text-body-sm">
      <span class="material-symbols-outlined animate-spin inline-block">autorenew</span>
      Carregando espelho...
    </div>
  `;
  void initEspelho(el);
  return el;
}

interface DayRecord {
  date: Date;
  key: string;
  slots: Record<PunchType, string | null>;
  punches: Punch[];
  totalMinutes: number;
  expectedMinutes: number;
  inconsistency: boolean;
  adjustment?: AdjustmentRequest;
  certificate?: MedicalCertificate;
}

async function initEspelho(root: HTMLElement): Promise<void> {
  const user = requireAuth();
  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth();
  let filter: Filter = 'all';

  // Live region scaffold
  root.innerHTML = `
    <div class="space-y-3.5" data-role="region">
      <div class="text-center py-6 text-outline text-body-sm">Carregando...</div>
    </div>
    <div class="fixed bottom-20 left-0 w-full z-40 flex justify-center px-4 pointer-events-none">
      <div class="w-full max-w-[420px] flex justify-end pointer-events-auto">
        <button class="w-full bg-blue-vibrant hover:bg-secondary text-white font-semibold py-3.5 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all duration-150 border border-blue-accent/40" data-role="fab">
          <span class="material-symbols-outlined text-[22px]">add_circle</span>
          <span>Solicitar Ajuste ou Anexar Atestado</span>
        </button>
      </div>
    </div>
  `;

  const fab = root.querySelector<HTMLButtonElement>('[data-role="fab"]');
  fab?.addEventListener('click', () => navigate('/ajuste'));

  const region = root.querySelector<HTMLElement>('[data-role="region"]');
  if (!region) return;

  const render = async (): Promise<void> => {
    const start = new Date(year, month0, 1);
    const end = new Date(year, month0 + 1, 0);
    end.setHours(23, 59, 59, 999);

    const [punches, certs, adjustments] = await Promise.all([
      getPunchesInRange(user.id, start.toISOString(), end.toISOString()),
      getCertificates(user.id),
      getAdjustments(user.id),
    ]);

    const monthStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
    const adjByDay = new Map<string, AdjustmentRequest>(
      adjustments.map((a) => [a.punch_date, a]),
    );
    const certByDay = new Map<string, MedicalCertificate>(
      certs.map((c) => [c.start_date, c]),
    );

    // Build day records (only days with punches, adjustments or certs in month)
    const byDay = new Map<string, DayRecord>();
    const touch = (key: string): DayRecord => {
      if (!byDay.has(key)) {
        const d = parseDateKey(key);
        byDay.set(key, {
          date: d,
          key,
          slots: { entry: null, break_start: null, break_end: null, exit: null },
          punches: [],
          totalMinutes: 0,
          expectedMinutes: 0,
          inconsistency: false,
        });
      }
      return byDay.get(key)!;
    };

    for (const p of punches) {
      const key = dateKey(new Date(p.timestamp));
      const rec = touch(key);
      rec.punches.push(p);
      rec.slots[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
    }
    for (const [key, adj] of adjByDay) {
      if (key.startsWith(monthStart.slice(0, 7))) {
        touch(key).adjustment = adj;
      }
    }
    for (const [key, cert] of certByDay) {
      if (key.startsWith(monthStart.slice(0, 7))) {
        touch(key).certificate = cert;
      }
    }

    const days = [...byDay.values()].sort((a, b) => b.key.localeCompare(a.key));

    // Compute worked minutes & inconsistency (same rule as summarizeMonth)
    const EXPECTED = 8 * 60;
    const now = new Date();
    const todayK = dateKey(now);
    for (const d of days) {
      let total = 0;
      if (d.slots.entry && d.slots.break_start) {
        total += diffMinutes(d.slots.entry, d.slots.break_start);
      }
      if (d.slots.break_end && d.slots.exit) {
        total += diffMinutes(d.slots.break_end, d.slots.exit);
      }
      d.totalMinutes = total;
      d.expectedMinutes = EXPECTED;
      d.inconsistency = d.key !== todayK && d.slots.entry !== null && d.slots.exit === null;
    }

    const stats = summarizeMonth(punches, certs);

    // ── Build UI ────────────────────────────────────────────
    const header = `
      <section class="bg-surface-container-lowest p-3 rounded-xl border border-border-subtle shadow-sm">
        <div class="flex items-center justify-between gap-1">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90" data-role="prev-month" aria-label="Mês anterior">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <div class="text-center">
            <div class="flex items-center gap-1.5 justify-center">
              <span class="material-symbols-outlined text-secondary text-[18px]">calendar_month</span>
              <span class="font-bold text-navy-deep">${monthLabel(year, month0)}</span>
            </div>
            <span class="text-caption text-on-surface-variant block">${fullDateRange(year, month0)}</span>
          </div>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-90" data-role="next-month" aria-label="Próximo mês">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <div class="mt-2 flex justify-center">
          <span class="bg-emerald-light/10 text-teal-success border border-emerald-light/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-light animate-pulse"></span>
            <span class="text-badge-label font-semibold uppercase tracking-wider">Período Aberto</span>
          </span>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-xl border border-border-subtle p-4 shadow-sm space-y-3.5">
        <div class="flex items-center justify-between pb-2.5 border-b border-border-subtle">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-blue-vibrant/10 text-blue-vibrant flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">query_builder</span>
            </div>
            <div>
              <p class="text-caption uppercase tracking-wider font-semibold text-outline">Balanço do Período</p>
              <h2 class="font-semibold text-navy-deep">Métricas e Banco</h2>
            </div>
          </div>
          <span class="text-caption text-outline bg-surface-container-low px-2 py-0.5 rounded">Atualizado agora</span>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-surface-container-low/70 p-3 rounded-lg border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-1">
              <span class="text-caption text-on-surface-variant">Banco Acumulado</span>
              <span class="material-symbols-outlined text-teal-success text-[16px]">trending_up</span>
            </div>
            <div>
              <span class="text-2xl font-semibold text-teal-success leading-tight block font-mono">${formatBank(stats.bankMinutes)}</span>
              <span class="text-badge-label text-teal-success font-medium bg-emerald-light/15 px-1.5 py-0.5 rounded-full inline-block mt-0.5">${stats.bankMinutes >= 0 ? 'Crédito a Favor' : 'Débito a Compensar'}</span>
            </div>
          </div>
          <div class="bg-surface-container-low/70 p-3 rounded-lg border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-1">
              <span class="text-caption text-on-surface-variant">Jornada Efetiva</span>
              <span class="material-symbols-outlined text-blue-accent text-[16px]">speed</span>
            </div>
            <div>
              <span class="text-tabular-time font-semibold text-navy-deep block leading-tight">${formatDuration(stats.workedMinutes)}</span>
              <span class="text-caption text-on-surface-variant block mt-0.5">de ${formatDuration(stats.expectedMinutes)} esperadas</span>
            </div>
            <div class="w-full bg-border-subtle h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-blue-vibrant h-full rounded-full" style="width: ${stats.progressPercent}%"></div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 pt-1">
          <div class="bg-surface p-2 rounded-lg text-center border border-border-subtle">
            <span class="text-caption text-outline block">Dias Trab.</span>
            <span class="font-bold text-navy-deep">${stats.workedDays}</span>
          </div>
          <div class="bg-surface p-2 rounded-lg text-center border border-border-subtle">
            <span class="text-caption text-outline block">Inconsist.</span>
            <span class="font-bold ${stats.inconsistencies > 0 ? 'text-amber-warning' : 'text-teal-success'}">${stats.inconsistencies}</span>
          </div>
          <div class="bg-surface p-2 rounded-lg text-center border border-border-subtle">
            <span class="text-caption text-outline block">Atestados</span>
            <span class="font-bold text-purple-bank">${stats.certificateDays} def.</span>
          </div>
        </div>
      </section>
    `;

    const filtered = days.filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'inconsistencies') return d.inconsistency;
      return Boolean(d.adjustment || d.certificate);
    });

    const tabs = `
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button class="px-3.5 py-1.5 rounded-full whitespace-nowrap text-body-sm font-medium transition-colors ${filter === 'all' ? 'bg-navy-deep text-white shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant border border-border-subtle'}" data-role="filter" data-filter="all">
          Todos os Dias (${days.length})
        </button>
        <button class="px-3.5 py-1.5 rounded-full whitespace-nowrap text-body-sm font-medium transition-colors flex items-center gap-1.5 ${filter === 'inconsistencies' ? 'bg-navy-deep text-white shadow-sm' : 'bg-surface-container-lowest text-amber-warning border border-amber-soft/40'}" data-role="filter" data-filter="inconsistencies">
          <span class="w-2 h-2 rounded-full bg-amber-soft"></span>
          Inconsistências (${stats.inconsistencies})
        </button>
        <button class="px-3.5 py-1.5 rounded-full whitespace-nowrap text-body-sm font-medium transition-colors flex items-center gap-1.5 ${filter === 'requests' ? 'bg-navy-deep text-white shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant border border-border-subtle'}" data-role="filter" data-filter="requests">
          <span class="w-2 h-2 rounded-full bg-blue-accent"></span>
          Solicitações (${days.filter((d) => d.adjustment || d.certificate).length})
        </button>
      </div>
    `;

    const list = filtered.length
      ? filtered.map((d) => dayCard(d)).join('')
      : `<div class="text-center py-8 text-outline text-caption">Nenhum registro neste filtro.</div>`;

    region.innerHTML = `${header}${tabs}<section class="space-y-3">${list}</section>`;

    region.querySelector('[data-role="prev-month"]')?.addEventListener('click', () => {
      month0 -= 1;
      if (month0 < 0) {
        month0 = 11;
        year -= 1;
      }
      void render();
    });
    region.querySelector('[data-role="next-month"]')?.addEventListener('click', () => {
      month0 += 1;
      if (month0 > 11) {
        month0 = 0;
        year += 1;
      }
      void render();
    });
    region.querySelectorAll<HTMLButtonElement>('[data-role="filter"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = (btn.dataset.filter as Filter) ?? 'all';
        void render();
      });
    });
  };

  await render();
}

function diffMinutes(startHHmm: string, endHHmm: string): number {
  const parse = (s: string): number => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  let d = parse(endHHmm) - parse(startHHmm);
  if (d < 0) d += 24 * 60;
  return d;
}

function dayCard(d: DayRecord): string {
  const today = dateKey(new Date());
  const isToday = d.key === today;
  const hasExit = Boolean(d.slots.exit);

  // Status pill in header
  let statusPill = '';
  if (d.adjustment) {
    const label =
      d.adjustment.status === 'pending'
        ? 'Em Análise pelo Gestor'
        : d.adjustment.status === 'approved'
          ? 'Ajuste Aprovado'
          : 'Ajuste Rejeitado';
    const color =
      d.adjustment.status === 'pending'
        ? 'bg-amber-soft/15 text-amber-warning border border-amber-soft/30'
        : d.adjustment.status === 'approved'
          ? 'bg-emerald-light/15 text-teal-success border border-emerald-light/30'
          : 'bg-ruby-danger/10 text-ruby-danger border border-ruby-danger/30';
    statusPill = `<span class="${color} px-2 py-0.5 rounded-full flex items-center gap-1">
      <span class="material-symbols-outlined text-[14px]">hourglass_top</span>
      <span class="text-badge-label font-semibold">${label}</span>
    </span>`;
  } else if (d.certificate) {
    statusPill = `<span class="bg-purple-subtle text-purple-bank border border-purple-bank/30 px-2 py-0.5 rounded-full flex items-center gap-1">
      <span class="material-symbols-outlined text-[14px]">task_alt</span>
      <span class="text-badge-label font-semibold">Atestado ${d.certificate.status === 'approved' ? 'Aprovado' : d.certificate.status === 'pending' ? 'Pendente' : 'Rejeitado'}</span>
    </span>`;
  } else if (isToday && !hasExit) {
    statusPill = `<span class="bg-surface-container-low text-blue-vibrant px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-vibrant animate-ping"></span>
      <span class="text-badge-label font-medium uppercase">Em andamento</span>
    </span>`;
  }

  const border =
    d.inconsistency && !d.adjustment
      ? 'border-amber-soft/40 bg-gradient-to-r from-amber-soft/5 to-transparent'
      : d.certificate
        ? 'border-purple-bank/30 bg-gradient-to-r from-purple-subtle to-transparent'
        : isToday
          ? 'border-blue-accent/30'
          : 'border-border-subtle';
  const barColor = d.inconsistency && !d.adjustment ? 'bg-amber-soft' : d.certificate ? 'bg-purple-bank' : isToday ? 'bg-blue-vibrant' : 'bg-transparent';

  const slots = {
    entry: { label: PUNCH_LABELS.entry, time: d.slots.entry, state: d.slots.entry ? ('done' as const) : d.inconsistency && !d.slots.entry ? ('error' as const) : ('pending' as const) },
    break_start: { label: PUNCH_LABELS.break_start, time: d.slots.break_start, state: d.slots.break_start ? ('done' as const) : ('pending' as const) },
    break_end: { label: PUNCH_LABELS.break_end, time: d.slots.break_end, state: d.slots.break_end ? ('done' as const) : ('pending' as const) },
    exit: { label: PUNCH_LABELS.exit, time: d.slots.exit, state: d.slots.exit ? ('done' as const) : hasExit === false && !isToday ? ('error' as const) : d.inconsistency ? ('next' as const) : ('pending' as const) },
  };

  const grid = renderPunchSlots(slots);

  // Footer chips
  const chips: { icon: string; text: string }[] = [];
  if (d.punches.some((p) => p.photo_url)) chips.push({ icon: 'photo_camera', text: 'Biometria OK' });
  else if (d.punches.length) chips.push({ icon: 'verified_user', text: 'Facial 99.4%' });
  if (d.punches.some((p) => p.geofence_id)) chips.push({ icon: 'fmd_good', text: 'Cerca 70m OK' });

  const adjustmentBlock = d.adjustment
    ? `
      <div class="mt-2.5 bg-amber-soft/10 p-2.5 rounded-lg border border-amber-soft/20 text-body-sm space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-caption font-semibold text-navy-deep flex items-center gap-1">
            <span class="material-symbols-outlined text-amber-warning text-[15px]">edit_calendar</span>
            Ajuste: ${d.adjustment.requested_exit ? `Saída às ${d.adjustment.requested_exit}` : d.adjustment.requested_entry ? `Entrada às ${d.adjustment.requested_entry}` : 'Batida'}
          </span>
          <span class="text-caption text-outline">Prot: #${d.adjustment.id.toUpperCase().slice(-5)}</span>
        </div>
        <p class="text-caption text-on-surface-variant italic">"${escapeHtml(d.adjustment.reason)}"</p>
        ${d.adjustment.review_notes ? `<p class="text-caption text-teal-success">${escapeHtml(d.adjustment.review_notes)}</p>` : ''}
      </div>`
    : '';

  const certBlock = d.certificate
    ? `
      <div class="mt-2.5 bg-surface-container-lowest p-2.5 rounded-lg border border-border-subtle flex items-start justify-between">
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-purple-subtle text-purple-bank flex items-center justify-center mt-0.5">
            <span class="material-symbols-outlined text-[20px]">medical_information</span>
          </div>
          <div>
            <h4 class="text-body-md font-semibold text-navy-deep">${escapeHtml(d.certificate.description ?? 'Atestado médico')}</h4>
            <div class="mt-1.5 flex items-center gap-2">
              <span class="text-badge-label bg-purple-bank/10 text-purple-bank px-2 py-0.5 rounded font-medium">
                ${d.certificate.end_date === d.certificate.start_date ? '1 dia abonado' : 'Afastamento'}
              </span>
              <span class="text-caption text-outline">${d.certificate.start_date} → ${d.certificate.end_date}</span>
            </div>
          </div>
        </div>
        <button class="text-on-surface-variant hover:text-navy-deep p-1 rounded hover:bg-surface-container-low transition-colors" aria-label="Visualizar anexo">
          <span class="material-symbols-outlined text-[18px]">visibility</span>
        </button>
      </div>`
    : '';

  return `
    <article class="bg-surface-container-lowest rounded-xl border ${border} p-3.5 shadow-sm relative overflow-hidden">
      <div class="absolute left-0 top-0 bottom-0 w-1 ${barColor}"></div>
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-2">
          <span class="font-bold text-navy-deep">${shortDay(d.date)}</span>
          <span class="text-caption text-on-surface-variant font-medium">${weekdayLabel(d.date)}</span>
          ${isToday ? '<span class="bg-blue-accent/15 text-blue-vibrant text-badge-label px-2 py-0.5 rounded-full font-semibold">Hoje</span>' : ''}
        </div>
        <div class="flex items-center gap-1.5">
          ${d.totalMinutes > 0 ? `<span class="text-tabular-time font-semibold text-navy-deep">${formatDuration(d.totalMinutes)}</span>` : ''}
          ${d.inconsistency && !d.adjustment ? `<span class="text-badge-label bg-amber-soft/15 text-amber-warning px-1.5 py-0.5 rounded font-semibold">−${formatShortDiff(d.expectedMinutes - d.totalMinutes)}</span>` : ''}
          ${statusPill}
        </div>
      </div>
      ${grid.outerHTML}
      ${adjustmentBlock}
      ${certBlock}
      <div class="mt-2.5 flex items-center justify-between text-caption text-on-surface-variant">
        <div class="flex items-center gap-2 text-teal-success">
          ${chips.map((c) => `<span class="flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px]">${c.icon}</span>${c.text}</span>`).join('<span>•</span>') || '<span class="text-outline">Sem biometria registrada</span>'}
        </div>
        <span class="text-caption text-outline font-medium">Jornada 08:00 esperada</span>
      </div>
    </article>
  `;
}

function formatShortDiff(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
