/**
 * Relatórios Analíticos & Gestão de Banco de Horas — admin (Stitch #17).
 *
 * - Executive KPI bento (saldo geral, horas extras, absenteísmo, alertas)
 * - Horas extras por departamento (bar chart via CSS)
 * - Jornada previsto vs efetivo (weekly comparison)
 * - Extrato detalhado de banco de horas por colaborador
 */
import { getAdminReport, getCompanySettings } from '../../api/data.js';
import type { AdminReportData, BankReportRow } from '../../api/data.js';
import { getCurrentUser } from '../../core/store.js';
import { renderStatCard } from '../../components/stat-card.js';
import { esc } from '../../utils/dom.js';
import { formatBank, formatDuration, formatLongDate, monthLabel } from '../../utils/time.js';

const OT_COLORS = ['bg-blue-vibrant', 'bg-purple-bank', 'bg-amber-soft', 'bg-teal-success', 'bg-ruby-danger'];

import { createAdminPageSkeleton } from '../../components/skeleton.js';

export async function renderRelatorios(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  // Show skeleton while loading
  el.appendChild(createAdminPageSkeleton());
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando dados…</p>';

  const user = getCurrentUser();
  const companyId = user?.company_id ?? 'cmp-001';
  const now = new Date();
  const year = now.getFullYear();
  const month0 = now.getMonth();

  try {
    const [report, settings] = await Promise.all([
      getAdminReport(companyId, year, month0),
      getCompanySettings(companyId),
    ]);
    el.innerHTML = '';

    // ── Header ──
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4';
    header.innerHTML = `
      <div>
        <div class="flex items-center gap-2 text-caption text-outline mb-1">
          <span>Relatórios Fiscais</span>
          <span>/</span>
          <span class="text-secondary font-medium">Analytics &amp; Gestão de Banco</span>
        </div>
        <h1 class="text-headline-lg font-bold text-on-surface tracking-tight">Relatórios Gerenciais &amp; Gestão de Banco de Horas</h1>
        <p class="text-body-md text-on-surface-variant mt-0.5">Acompanhamento em tempo real de horas extras, absenteísmo, passivo trabalhista e compensação de jornadas.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-secondary text-caption border border-border-subtle font-medium">
          <span class="material-symbols-outlined text-sm">gavel</span>
          Art. 59 § 2º e § 5º da CLT
        </span>
      </div>`;
    el.appendChild(header);

    // ── Period + export bar ──
    const filterBar = document.createElement('section');
    filterBar.className = 'bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3';
    filterBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-caption text-outline uppercase font-semibold">Período de Apuração</span>
          <div class="relative inline-flex items-center">
            <span class="material-symbols-outlined absolute left-2.5 text-outline text-lg pointer-events-none">calendar_month</span>
            <span class="pl-8 pr-3 py-1.5 bg-neutral-canvas border border-border-subtle rounded-lg text-body-sm font-medium text-on-surface">${monthLabel(year, month0)}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-caption text-outline uppercase font-semibold">Status do Saldo</span>
          <div class="flex items-center gap-1.5 py-0.5">
            <span class="px-2.5 py-1 rounded-lg bg-surface-container-low text-secondary text-caption font-semibold">Todos</span>
            <span class="px-2.5 py-1 rounded-lg bg-neutral-canvas border border-border-subtle text-on-surface-variant text-caption">Crédito Alto (&gt;20h)</span>
            <span class="px-2.5 py-1 rounded-lg bg-neutral-canvas border border-border-subtle text-on-surface-variant text-caption">Vencendo &lt;30d</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle bg-neutral-card text-on-surface text-body-sm font-medium hover:bg-surface-container-low hover:border-teal-success hover:text-teal-success transition-colors btn-export-csv">
          <span class="material-symbols-outlined text-teal-success text-lg">table_chart</span>
          <span>Exportar CSV</span>
        </button>
        <button class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy-deep text-white text-body-sm font-medium hover:bg-navy-surface shadow-sm transition-colors btn-export-txt">
          <span class="material-symbols-outlined text-ruby-danger text-lg">picture_as_pdf</span>
          <span>Relatório Executivo (.txt)</span>
        </button>
      </div>`;
    el.appendChild(filterBar);

    // ── KPI grid ──
    const kpi = document.createElement('section');
    kpi.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
    kpi.appendChild(renderStatCard({
      label: 'Saldo Geral do Banco',
      value: formatBank(report.totalBankMinutes),
      hint: 'Crédito Acumulado Global',
      icon: 'account_balance_wallet',
      tone: 'purple',
      pill: report.totalBankMinutes >= 0 ? 'Em Conformidade' : 'Débito',
      pillTone: report.totalBankMinutes >= 0 ? 'success' : 'warning',
    }));
    kpi.appendChild(renderStatCard({
      label: 'Horas Extras Totais',
      value: formatDuration(report.totalOvertimeMinutes),
      hint: `HE 50%: ${formatDuration(report.overtime50)} • HE 100%: ${formatDuration(report.overtime100)}`,
      icon: 'more_time',
      tone: 'blue',
    }));
    kpi.appendChild(renderStatCard({
      label: 'Taxa de Absenteísmo',
      value: `${Math.round(report.absenceRate * 10) / 10}%`,
      hint: 'Meta Operacional: < 3.0%',
      icon: 'event_busy',
      tone: 'emerald',
      pill: report.absenceRate < 3 ? 'Excelente' : 'Atenção',
      pillTone: report.absenceRate < 3 ? 'success' : 'danger',
    }));
    kpi.appendChild(renderStatCard({
      label: 'Alertas de Vencimento',
      value: `${report.expiringCount} Colaboradores`,
      hint: 'Vencendo em ≤ 30 dias',
      icon: 'warning',
      tone: 'danger',
      pill: 'Ação Urgente',
      pillTone: 'warning',
      pulse: true,
    }));
    el.appendChild(kpi);

    // ── Charts: dept overtime + weekly previsto×efetivo ──
    const charts = document.createElement('section');
    charts.className = 'grid grid-cols-1 lg:grid-cols-12 gap-6';
    charts.appendChild(renderDeptChart(report));
    charts.appendChild(renderWeeklyChart(report));
    el.appendChild(charts);

    // ── Bank hours table ──
    el.appendChild(renderBankTable(report.rows, year, month0));

    // Export actions
    el.querySelector('.btn-export-csv')?.addEventListener('click', () => exportCsv(report));
    el.querySelector('.btn-export-txt')?.addEventListener('click', () => exportTxt(report, year, month0));

    void settings;
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderDeptChart(report: AdminReportData): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lg:col-span-6 bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col';
  const bars = report.departmentBreakdown
    .map((d, i) => {
      const color = OT_COLORS[i % OT_COLORS.length];
      const pct = Math.min(100, d.percent);
      return `
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-body-sm">
            <span class="font-medium text-on-surface flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded ${color}"></span>
              ${esc(d.name)}
            </span>
            <div class="flex items-center gap-3">
              <span class="text-outline text-caption">${formatDuration(d.overtimeMinutes)}</span>
              <span class="font-tabular-time font-semibold text-on-surface">${d.percent}%</span>
            </div>
          </div>
          <div class="w-full bg-surface-container-low h-3 rounded-full overflow-hidden flex" role="img" aria-label="${d.percent}%">
            <div class="${color} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
          </div>
        </div>`;
    })
    .join('');

  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-headline-sm text-on-surface">Horas Extras por Departamento</h2>
        <p class="text-caption text-outline">Concentração de horas adicionais no ciclo atual</p>
      </div>
      <span class="text-caption px-2.5 py-1 rounded bg-surface-container text-secondary font-medium">Mês Corrente</span>
    </div>
    <div class="flex flex-col gap-4 my-auto pt-2">
      ${bars || '<p class="text-caption text-outline">Sem horas extras no período.</p>'}
    </div>
    <div class="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between text-caption text-outline">
      <span>Total consolidado: <strong class="text-on-surface font-tabular-time">${formatDuration(report.totalOvertimeMinutes)} extras</strong></span>
    </div>`;
  return wrap;
}

function renderWeeklyChart(report: AdminReportData): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lg:col-span-6 bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col';

  const max = Math.max(1, ...report.weekly.map((w) => Math.max(w.expectedMinutes, w.workedMinutes)));
  const weeks = report.weekly
    .map((w) => {
      const expectedPct = Math.round((w.expectedMinutes / max) * 100);
      const workedPct = Math.round((w.workedMinutes / max) * 100);
      const balance = w.workedMinutes - w.expectedMinutes;
      const last = w === report.weekly[report.weekly.length - 1];
      return `
        <div class="bg-neutral-canvas rounded-lg p-3 border border-border-subtle flex flex-col items-center">
          <span class="text-caption text-outline font-semibold mb-2">${esc(w.label)}</span>
          <div class="h-28 flex items-end gap-2 w-full justify-center pb-1">
            <div class="w-5 bg-border-subtle rounded-t flex items-end justify-center group relative" style="height: ${expectedPct}%" title="Previsto ${formatDuration(w.expectedMinutes)}">
              <span class="absolute -top-5 text-[10px] font-tabular-time bg-navy-deep text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">${formatDuration(w.expectedMinutes)}</span>
            </div>
            <div class="w-5 ${last ? 'bg-blue-accent' : 'bg-secondary'} rounded-t flex items-end justify-center group relative" style="height: ${workedPct}%" title="Efetivo ${formatDuration(w.workedMinutes)}">
              <span class="absolute -top-5 text-[10px] font-tabular-time bg-navy-deep text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">${formatDuration(w.workedMinutes)}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-border-subtle w-full text-center">
            <span class="text-caption font-tabular-time ${balance > 0 ? 'text-teal-success' : balance < 0 ? 'text-ruby-danger' : 'text-on-surface-variant'} font-semibold">${last ? 'Em curso' : formatBank(balance)}</span>
          </div>
        </div>`;
    })
    .join('');

  const overallBalance = report.weekly.reduce((acc, w) => acc + (w.workedMinutes - w.expectedMinutes), 0);
  const adherence = report.weekly.reduce((acc, w) => acc + w.expectedMinutes, 0);
  const adherencePct = adherence > 0 ? Math.round((report.weekly.reduce((acc, w) => acc + w.workedMinutes, 0) / adherence) * 1000) / 10 : 0;

  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-headline-sm text-on-surface">Jornada: Previsto vs Efetivo</h2>
        <p class="text-caption text-outline">Acompanhamento comparativo semanal das horas de trabalho</p>
      </div>
      <div class="flex items-center gap-3 text-caption">
        <span class="flex items-center gap-1.5 text-on-surface"><span class="w-3 h-1 bg-outline rounded-full inline-block"></span> Previsto</span>
        <span class="flex items-center gap-1.5 text-secondary font-semibold"><span class="w-3 h-1 bg-secondary rounded-full inline-block"></span> Efetivo</span>
      </div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 my-auto pt-2">
      ${weeks}
    </div>
    <div class="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between text-caption text-outline">
      <span>Aderência à escala programada: <strong class="text-teal-success font-semibold">${adherencePct}%</strong></span>
      <span class="text-on-surface-variant">Saldo agregado: <strong class="${overallBalance >= 0 ? 'text-teal-success' : 'text-ruby-danger'} font-tabular-time">${formatBank(overallBalance)}</strong></span>
    </div>`;
  return wrap;
}

function renderBankTable(rows: BankReportRow[], year: number, month0: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'bg-neutral-card rounded-xl border border-border-subtle shadow-sm overflow-hidden';

  let body = '';
  for (const r of rows) {
    const initials = r.user.name.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('').toUpperCase();
    const expiryPill =
      r.expiryDays === null
        ? '<span class="text-caption text-outline">—</span>'
        : r.expiryDays <= 30
          ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-ruby-danger text-badge-label font-semibold"><span class="material-symbols-outlined text-xs">timer</span>${r.expiryDays} dias</span>`
          : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-soft/10 text-amber-warning text-badge-label font-semibold"><span class="material-symbols-outlined text-xs">schedule</span>${r.expiryDays} dias</span>`;

    body += `
      <tr class="hover:bg-neutral-canvas transition-colors">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-surface-container text-secondary flex items-center justify-center font-bold text-caption">${esc(initials)}</div>
            <div>
              <div class="font-semibold text-on-surface leading-snug">${esc(r.user.name)}</div>
              <div class="text-caption text-outline font-tabular-time">${r.user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4"><div class="text-on-surface font-medium">${esc(r.departmentName)}</div><div class="text-caption text-outline">${esc(r.scheduleName)}</div></td>
        <td class="py-3 px-4 text-right font-tabular-time font-medium text-on-surface">${formatDuration(r.workedMinutes)}</td>
        <td class="py-3 px-4 text-right font-tabular-time text-on-surface">
          <span class="font-semibold">${formatDuration(r.overtime50 + r.overtime100)}</span>
          <span class="text-caption text-outline block">(${formatDuration(r.overtime50)} / ${formatDuration(r.overtime100)})</span>
        </td>
        <td class="py-3 px-4 text-right font-tabular-time text-outline">${r.absences}d</td>
        <td class="py-3 px-4 text-right font-tabular-time ${r.monthBalance >= 0 ? 'text-teal-success' : 'text-ruby-danger'} font-semibold">${formatBank(r.monthBalance)}</td>
        <td class="py-3 px-4 text-right font-tabular-time ${r.accumulatedBalance >= 0 ? 'text-purple-bank' : 'text-ruby-danger'} font-bold">${formatBank(r.accumulatedBalance)}</td>
        <td class="py-3 px-4 text-center">${expiryPill}</td>
      </tr>`;
  }

  wrap.innerHTML = `
    <div class="p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-headline-sm text-on-surface">Extrato e Gestão de Banco de Horas por Colaborador</h2>
        <p class="text-caption text-outline">Controle individualizado com vencimentos legais, compensações e saldo cumulativo • ${monthLabel(year, month0)}</p>
      </div>
      <span class="text-caption text-on-surface-variant">${rows.length} colaboradores</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-navy-surface text-white text-badge-label uppercase tracking-wider">
            <th class="py-3 px-4 font-semibold">Colaborador</th>
            <th class="py-3 px-4 font-semibold">Setor &amp; Regime</th>
            <th class="py-3 px-4 font-semibold text-right">Trabalhado</th>
            <th class="py-3 px-4 font-semibold text-right">HE (50% / 100%)</th>
            <th class="py-3 px-4 font-semibold text-right">Faltas</th>
            <th class="py-3 px-4 font-semibold text-right">Saldo Mês</th>
            <th class="py-3 px-4 font-semibold text-right">Saldo Acumulado</th>
            <th class="py-3 px-4 font-semibold text-center">Vencimento</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle text-body-sm">
          ${body || '<tr><td colspan="8" class="py-8 text-center text-caption text-outline">Sem colaboradores no período.</td></tr>'}
        </tbody>
      </table>
    </div>`;
  return wrap;
}

function exportCsv(report: AdminReportData): void {
  const header = ['Nome', 'CPF', 'Departamento', 'Trabalhado', 'HE50', 'HE100', 'Faltas', 'Saldo'];
  const lines = [header.join(';')];
  for (const r of report.rows) {
    lines.push([
      r.user.name,
      r.user.cpf,
      r.departmentName,
      formatDuration(r.workedMinutes),
      formatDuration(r.overtime50),
      formatDuration(r.overtime100),
      String(r.absences),
      formatBank(r.monthBalance),
    ].join(';'));
  }
  download(`${formatLongDate().replace(/\s/g, '-').toLowerCase()}-banco-horas.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
}

function exportTxt(report: AdminReportData, year: number, month0: number): void {
  const lines: string[] = [
    `pPonto — Relatório Executivo — ${monthLabel(year, month0)}`,
    `Gerado em ${formatLongDate()}`,
    '',
    `Saldo Geral do Banco: ${formatBank(report.totalBankMinutes)}`,
    `Horas Extras Totais: ${formatDuration(report.totalOvertimeMinutes)} (50%: ${formatDuration(report.overtime50)} / 100%: ${formatDuration(report.overtime100)})`,
    `Absenteísmo: ${Math.round(report.absenceRate * 10) / 10}%`,
    `Alertas de Vencimento (≤30d): ${report.expiringCount}`,
    '',
    'Colaborador;Setor;Trabalhado;Saldo',
  ];
  for (const r of report.rows) {
    lines.push(`${r.user.name};${r.departmentName};${formatDuration(r.workedMinutes)};${formatBank(r.monthBalance)}`);
  }
  download(`${monthLabel(year, month0).toLowerCase().replace(/\s/g, '-')}-executivo.txt`, lines.join('\n'));
}

function download(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}