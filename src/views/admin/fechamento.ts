/**
 * Fechamento de Folha & Exportação Fiscal — admin (Stitch #12).
 *
 * - Workflow progress ribbon (4-step timeline)
 * - Portaria 671 MTE file export cards: AFD, AFDT, ACJEF, payroll layout
 * - Audit trail of emitted lots (ICP-Brasil signature simulation)
 * - Conclude & lock the payroll period
 */
import {
  getAdminReport,
  getCompanySettings,
  listAdminUsers,
  updateCompanySettings,
} from '../../api/data.js';
import { getCurrentUser } from '../../core/store.js';
import {
  buildAcjef,
  buildAfdt,
  buildPayrollCsv,
  downloadTextFile,
  fiscalFilename,
} from '../../utils/fiscal.js';
import { formatBank, formatDuration, formatLongDate, monthLabel } from '../../utils/time.js';
import { showModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';

import { createAdminPageSkeleton } from '../../components/skeleton.js';

export async function renderFechamento(): Promise<HTMLElement> {
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
  const periodKey = `${year}-${String(month0 + 1).padStart(2, '0')}`;
  const closed = localStorage.getItem(`pponto:closed:${periodKey}`) === '1';

  try {
    const [report, users, settings] = await Promise.all([
      getAdminReport(companyId, year, month0),
      listAdminUsers(),
      getCompanySettings(companyId),
    ]);
    el.innerHTML = '';

    renderContent(el, { report, users, settings, year, month0, periodKey, closed, companyId });
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

interface FechamentoState {
  report: Awaited<ReturnType<typeof getAdminReport>>;
  users: Awaited<ReturnType<typeof listAdminUsers>>;
  settings: Awaited<ReturnType<typeof getCompanySettings>>;
  year: number;
  month0: number;
  periodKey: string;
  closed: boolean;
  companyId: string;
}

function renderContent(el: HTMLElement, s: FechamentoState): void {
  const cnpj = '45.928.110/0001-92';
  const company = { cnpj, name: 'Umbran Digital Ltda' };
  const inconsistencies = s.users.filter((u) => u.inconsistency !== 'none').length;

  // ── Header ──
  const header = document.createElement('section');
  header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4';
  header.innerHTML = `
    <div>
      <div class="flex items-center gap-3">
        <h1 class="text-headline-lg font-bold text-on-surface tracking-tight">Fechamento de Ponto &amp; Auditoria Fiscal Portaria 671 MTE</h1>
        <span class="bg-blue-50 text-blue-vibrant text-caption px-2.5 py-0.5 rounded-full border border-blue-200">REP-P v3.4 Certificado</span>
      </div>
      <p class="text-body-md text-on-surface-variant mt-1 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-outline">info</span>
        <span>Competência: <strong>${monthLabel(s.year, s.month0)}</strong> • Matriz SP (CNPJ: ${cnpj}) • Período: ${s.periodKey}</span>
      </p>
    </div>
    <div class="flex items-center gap-3 bg-neutral-card border border-border-subtle px-4 py-2.5 rounded-xl shadow-sm shrink-0">
      <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-teal-success">
        <span class="material-symbols-outlined text-[22px]">task_alt</span>
      </div>
      <div class="flex flex-col">
        <span class="text-caption text-outline">Status de Auditoria MTE</span>
        <span class="text-headline-sm text-on-surface font-semibold">${s.closed ? 'Fechada' : '100% Homologável'}</span>
      </div>
    </div>`;
  el.appendChild(header);

  // ── Workflow ribbon ──
  el.appendChild(renderWorkflow(s, inconsistencies));

  // ── Fiscal file export cards ──
  el.appendChild(renderExportCards(s, company));

  // ── Audit trail ──
  el.appendChild(renderAuditTrail(s, cnpj));

  // ── Conclude button ──
  const concludeCard = document.createElement('section');
  concludeCard.className = 'bg-neutral-card border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4';
  concludeCard.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-error-container text-ruby-danger flex items-center justify-center">
        <span class="material-symbols-outlined">lock</span>
      </div>
      <div>
        <h3 class="text-headline-sm text-on-surface">Concluir Fechamento &amp; Assinar com Certificado ICP-Brasil</h3>
        <p class="text-body-sm text-on-surface-variant mt-0.5">Ao concluir, o espelho de ponto será congelado para alterações e os arquivos oficiais serão assinados com o certificado configurado.</p>
      </div>
    </div>
    <button class="px-5 py-2.5 rounded-lg ${s.closed ? 'bg-neutral-canvas text-outline border border-border-subtle cursor-not-allowed' : 'bg-navy-deep text-white hover:bg-navy-surface shadow-sm'} font-semibold flex items-center gap-2 transition-colors btn-conclude" ${s.closed ? 'disabled' : ''}>
      <span class="material-symbols-outlined">${s.closed ? 'lock' : 'draw'}</span>
      <span>${s.closed ? 'Período Fechado' : 'Concluir Fechamento & Assinar'}</span>
    </button>`;
  concludeCard.querySelector('.btn-conclude')?.addEventListener('click', () => {
    void handleConclude(s);
  });
  el.appendChild(concludeCard);
}

function renderWorkflow(s: FechamentoState, inconsistencies: number): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card border border-border-subtle rounded-xl p-5 shadow-sm space-y-4';

  const step = (n: number, title: string, sub: string, done: boolean, active = false): string => {
    const color = active
      ? 'bg-blue-vibrant text-white animate-bounce'
      : done
        ? 'bg-teal-success text-white'
        : 'bg-border-subtle text-outline';
    const ring = active ? 'border-2 border-blue-vibrant shadow-sm ring-2 ring-blue-100' : done ? 'border border-emerald-200' : 'border border-border-subtle';
    const label = active
      ? 'text-blue-vibrant'
      : done
        ? 'text-teal-success'
        : 'text-outline';
    return `
      <div class="relative flex items-center p-3 rounded-lg ${ring} ${active ? 'bg-blue-50/80' : done ? 'bg-emerald-50/50' : 'bg-neutral-canvas'}">
        <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0 mr-3">
          <span class="material-symbols-outlined text-[18px]">${done ? 'check' : active ? 'draw' : 'radio_button_unchecked'}</span>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-caption uppercase ${label} font-semibold">Etapa ${n} • ${done ? '100% Concluído' : active ? 'Etapa Atual' : 'Pendente'}</span>
          <span class="text-body-md font-semibold text-on-surface truncate">${title}</span>
          <span class="text-caption text-outline">${sub}</span>
        </div>
      </div>`;
  };

  section.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-subtle pb-3">
      <div class="flex items-center gap-2.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-light animate-pulse"></span>
        <span class="text-headline-sm text-navy-deep">Progresso de Fechamento de Folha</span>
        <span class="text-caption text-outline-variant">|</span>
        <span class="text-body-sm font-semibold ${s.closed ? 'text-teal-success' : 'text-amber-warning'}">${s.closed ? 'Folha Fechada — Período Congelado' : `${inconsistencies} inconsistências pendentes em ${s.users.length} colaboradores`}</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      ${step(1, 'Tratamento de Ponto', `${s.users.length - inconsistencies}/${s.users.length} espelhos validados`, inconsistencies === 0 || s.closed)}
      ${step(2, 'Homologação Atestados', 'Atestados laudados', s.closed)}
      ${step(3, 'Banco de Horas', 'Acordos CCT sincronizados', s.closed)}
      ${step(4, 'Assinatura & Emissão Fiscal', s.closed ? 'Lotes assinados' : 'Aguardando comando final', s.closed, !s.closed)}
    </div>`;
  return section;
}

function renderExportCards(s: FechamentoState, company: { cnpj: string; name: string }): HTMLElement {
  const section = document.createElement('section');
  section.className = 'space-y-3';

  const nsrRange = s.report.rows.reduce((acc, r) => acc + Math.max(0, r.workedMinutes > 0 ? 4 : 0), 0);
  const header = `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px] text-blue-vibrant">receipt_long</span>
        <h2 class="text-headline-md text-navy-deep font-semibold">Arquivos Regulamentares Portaria 671 MTE</h2>
      </div>
      <span class="text-caption text-outline">Layouts vigentes conforme Art. 83 a 87 da Portaria MTE nº 671/2021</span>
    </div>`;

  const card = (
    icon: string,
    iconWrap: string,
    art: string,
    artPill: string,
    title: string,
    desc: string,
    stats: string,
    btnLabel: string,
    btnClass: string,
    btnIcon: string,
    dataAct: string,
  ): string => {
    const id = `export-${dataAct}`;
    return `
      <div class="bg-neutral-card border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="p-2 rounded-lg ${iconWrap}"><span class="material-symbols-outlined text-[22px]">${icon}</span></span>
            <span class="text-badge-label uppercase px-2 py-0.5 rounded ${artPill} border">${art}</span>
          </div>
          <div>
            <h3 class="text-headline-sm text-navy-deep">${title}</h3>
            <p class="text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">${desc}</p>
          </div>
          <div class="bg-neutral-canvas rounded-lg p-3 space-y-1.5 border border-border-subtle font-tabular-time text-body-sm">${stats}</div>
        </div>
        <div class="pt-4 mt-2 border-t border-border-subtle">
          <button class="w-full flex items-center justify-center gap-2 py-2 px-3 ${btnClass} rounded-lg text-body-sm font-semibold transition-colors" id="${id}" data-act="${dataAct}">
            <span class="material-symbols-outlined text-[18px]">${btnIcon}</span><span>${btnLabel}</span>
          </button>
        </div>
      </div>`;
  };

  const actAfd = (): void => {
    const punchCount = nsrRange;
    const hash = `${punchCount}-${s.periodKey}`;
    const lines: string[] = [];
    let seq = 1;
    for (const r of s.report.rows) {
      if (r.workedMinutes <= 0) continue;
      const cpf = r.user.cpf.replace(/\D/g, '').padStart(11, '0');
      const types: [string, number][] = [['E', 9], ['I', 12], ['T', 13], ['S', 18]];
      for (const [t, hh] of types) {
        if (seq > Math.min(4, Math.ceil(r.workedMinutes / 240))) break;
        lines.push(`1|${String(seq).padStart(9, '0')}|${t}|${String(hh).padStart(2, '0')}00|${s.periodKey.replace('-', '')}01|${cpf}|MOBILE|SYN-${hash}`);
        seq += 1;
      }
    }
    const content = [
      `AFD|${cnpjDigits(company.cnpj)}|${company.name.slice(0, 50)}|${s.periodKey}${'00'}|PPONTO|1.0`,
      ...lines,
      `9|${String(seq).padStart(9, '0')}|${lines.length}`,
    ].join('\n');
    downloadTextFile(fiscalFilename('AFD', company.cnpj, s.year, s.month0), content);
    showToast('AFD gerado com sucesso', `Arquivo assinado SHA-256 • ${lines.length} NSRs`, { icon: 'download', tone: 'success' });
  };

  const actAfdt = (): void => {
    const entries = s.report.rows
      .filter((r) => r.workedMinutes > 0 || r.absences > 0)
      .map((r) => ({
        user: { name: r.user.name, cpf: r.user.cpf },
        date: `${s.periodKey}-01`,
        original: { entry: '08:00', break_start: '12:00', break_end: '13:00', exit: String(18 - Math.floor(r.workedMinutes / 60)).padStart(2, '0') + ':00' },
        justification: r.absences > 0 ? `Faltas: ${r.absences} dia(s) — abono pendente` : undefined,
      }));
    const content = buildAfdt(company, entries, s.year, s.month0);
    downloadTextFile(fiscalFilename('AFDT', company.cnpj, s.year, s.month0), content);
    showToast('AFDT gerado com sucesso', `${entries.length} colaboradores espelhados`, { icon: 'download', tone: 'success' });
  };

  const actAcjef = (): void => {
    const rows = s.report.rows.map((r) => ({
      user: { name: r.user.name, cpf: r.user.cpf },
      normalMinutes: r.workedMinutes - r.overtime50 - r.overtime100,
      overtime50: r.overtime50,
      overtime100: r.overtime100,
      nightAdditional: 0,
      bankMinutes: r.monthBalance,
    }));
    const content = buildAcjef(company, rows, s.year, s.month0);
    downloadTextFile(fiscalFilename('ACJEF', company.cnpj, s.year, s.month0), content);
    showToast('ACJEF gerado com sucesso', `${rows.length} demonstrativos analíticos`, { icon: 'download', tone: 'success' });
  };

  const actPayroll = (): void => {
    const rows = s.report.rows.map((r) => ({
      user: { name: r.user.name, cpf: r.user.cpf },
      workedMinutes: r.workedMinutes,
      overtime50: r.overtime50,
      overtime100: r.overtime100,
      absences: r.absences,
      lateMinutes: r.lateMinutes,
      bankMinutes: r.monthBalance,
    }));
    const content = buildPayrollCsv(company, rows, s.year, s.month0);
    downloadTextFile(`layout-folha-${s.periodKey}.csv`, content, 'text/csv;charset=utf-8');
    showToast('Layout exportado', 'Arquivo pronto para TOTVS/Senior/ADP', { icon: 'file_upload', tone: 'success' });
  };

  const statsAfd = `
    <div class="flex justify-between text-outline"><span>NSRs Gravados:</span><span class="text-on-surface font-semibold">${String(nsrRange).padStart(5, '0')} a ${String(Math.max(nsrRange, 1) + 952).padStart(5, '0')}</span></div>
    <div class="flex justify-between text-outline"><span>Total de Registros:</span><span class="text-on-surface font-semibold">${nsrRange} linhas</span></div>`;
  const statsAfdt = `
    <div class="flex justify-between text-outline"><span>Espelhos:</span><span class="text-on-surface font-semibold">${s.report.rows.length}</span></div>
    <div class="flex justify-between text-outline"><span>Ajustes Justificados:</span><span class="text-teal-success font-semibold">${s.report.rows.filter((r) => r.absences > 0).length} registros</span></div>`;
  const statsAcjef = `
    <div class="flex justify-between text-outline"><span>Horas Normais Mês:</span><span class="text-on-surface font-semibold">${formatDuration(s.report.totalBankMinutes + s.report.totalOvertimeMinutes * (s.report.totalBankMinutes < 0 ? -1 : 1))}</span></div>
    <div class="flex justify-between text-outline"><span>Saldo Banco Horas:</span><span class="text-purple-bank font-semibold">${formatBank(s.report.totalBankMinutes)}</span></div>`;

  section.innerHTML = `
    ${header}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      ${card('fingerprint', 'bg-slate-100 text-navy-deep', 'Art. 83 MTE', 'bg-blue-50 text-secondary border-blue-200', 'Arquivo Fonte de Dados (AFD)', 'Registro primário e inviolável de todas as marcações digitais via sistema REP-P homologado com hash SHA-256.', statsAfd, 'Gerar & Baixar AFD (.txt assinado)', 'bg-neutral-canvas hover:bg-slate-100 border border-border-subtle text-on-surface', 'download', 'afd')}
      ${card('edit_calendar', 'bg-amber-50 text-amber-warning', 'Art. 84 MTE', 'bg-amber-50 text-amber-warning border-amber-200', 'Arquivo Fonte Tratado (AFDT)', 'Espelhamento de batidas originais vs. tratadas, contemplando marcações desconsideradas e motivos de abono.', statsAfdt, 'Gerar AFDT (.txt)', 'bg-neutral-canvas hover:bg-slate-100 border border-border-subtle text-on-surface', 'download', 'afdt')}
      ${card('calculate', 'bg-emerald-50 text-teal-success', 'Art. 85 MTE', 'bg-emerald-50 text-teal-success border-emerald-200', 'Controle de Jornada (ACJEF)', 'Demonstrativo e consolidação analítica de horas normais, extras (50%, 100%), adicionais noturnos e débitos de banco de horas.', statsAcjef, 'Gerar ACJEF (.txt)', 'bg-neutral-canvas hover:bg-slate-100 border border-border-subtle text-on-surface', 'download', 'acjef')}
      ${card('sync_alt', 'bg-blue-50 text-blue-vibrant', 'ERP Sync', 'bg-blue-50 text-blue-vibrant border-blue-200', 'Layout de Folha de Pagamento', 'Exportação direta parametrizada para softwares de folha contábil com mapeamento de rubricas e eventos salariais.', `
        <div class="flex justify-between text-outline"><span>Horas Trabalhadas:</span><span class="text-on-surface font-semibold">${formatDuration(s.report.rows.reduce((a, r) => a + r.workedMinutes, 0))}</span></div>
        <div class="flex justify-between text-outline"><span>HE 50% / 100%:</span><span class="text-on-surface font-semibold">${formatDuration(s.report.overtime50)} / ${formatDuration(s.report.overtime100)}</span></div>`, 'Exportar Layout Folha (.csv)', 'bg-secondary hover:bg-blue-vibrant text-white', 'file_upload', 'folha')}
    </div>`;

  const actions: Record<string, () => void> = { afd: actAfd, afdt: actAfdt, acjef: actAcjef, folha: actPayroll };
  section.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
    const act = btn.dataset.act;
    if (act && actions[act]) btn.addEventListener('click', actions[act]);
  });

  return section;
}

function renderAuditTrail(s: FechamentoState, cnpj: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card border border-border-subtle rounded-xl shadow-sm overflow-hidden';

  const rows = [
    { kind: 'AFD', date: 'hoje', status: s.closed ? 'Assinado' : 'Pendente', hash: '7f83b165ff1fc53b...' },
    { kind: 'AFDT', date: 'hoje', status: s.closed ? 'Assinado' : 'Pendente', hash: '3f4a9b8c2d1e0f7a...' },
    { kind: 'ACJEF', date: 'hoje', status: s.closed ? 'Assinado' : 'Pendente', hash: 'a1b2c3d4e5f60718...' },
  ];

  section.innerHTML = `
    <div class="p-5 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-blue-vibrant">history_edu</span>
          <h2 class="text-headline-md text-navy-deep font-semibold">Auditoria de Lotes Emitidos &amp; Assinaturas ICP-Brasil</h2>
        </div>
        <p class="text-body-sm text-on-surface-variant mt-0.5">Histórico rastreável das remessas oficiais geradas, carimbo de tempo e assinaturas eletrônicas auditáveis pelo MTE.</p>
      </div>
      <span class="text-caption text-outline">CNPJ: ${cnpj}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-border-subtle text-caption text-outline uppercase tracking-wider">
            <th class="py-3 px-4 font-semibold">Arquivo</th>
            <th class="py-3 px-4 font-semibold">Emissão</th>
            <th class="py-3 px-4 font-semibold">Hash SHA-256</th>
            <th class="py-3 px-4 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle text-body-sm">
          ${rows.map((r) => `
            <tr class="hover:bg-neutral-canvas">
              <td class="py-3 px-4 font-semibold text-on-surface font-mono">${r.kind}</td>
              <td class="py-3 px-4 text-on-surface-variant">${r.date} • ${formatLongDate()}</td>
              <td class="py-3 px-4 font-mono text-caption text-outline">${r.hash}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${r.status === 'Assinado' ? 'bg-emerald-light/10 text-teal-success' : 'bg-amber-soft/10 text-amber-warning'} text-caption font-semibold">
                  <span class="material-symbols-outlined text-xs">${r.status === 'Assinado' ? 'verified' : 'pending'}</span>${r.status}
                </span>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  return section;
}

function cnpjDigits(cnpj: string): string {
  return cnpj.replace(/\D/g, '').padStart(14, '0');
}

async function handleConclude(s: FechamentoState): Promise<void> {
  const { confirmed } = await showModal({
    title: 'Concluir Fechamento de Folha',
    bodyHtml: `
      <p class="text-body-md text-on-surface-variant">Competência <strong>${monthLabel(s.year, s.month0)}</strong> será congelada. Esta ação:</p>
      <ul class="mt-3 space-y-1.5 text-body-sm text-on-surface-variant list-disc pl-5">
        <li>Trava os espelhos de ponto para novas alterações</li>
        <li>Assina os arquivos AFD/AFDT/ACJEF com certificado ICP-Brasil</li>
        <li>Gera o registro de auditoria MTE</li>
      </ul>`,
    confirmLabel: 'Assinar & Fechar',
    danger: true,
  });
  if (!confirmed) return;

  // Simulate a signature + persist the closed state (localStorage for demo;
  // in production this would call an API).
  localStorage.setItem(`pponto:closed:${s.periodKey}`, '1');
  await updateCompanySettings(s.companyId, { reminders_enabled: 0 }).catch(() => undefined);
  showToast('Folha fechada com sucesso', `Competência ${monthLabel(s.year, s.month0)} assinada e congelada.`, { icon: 'verified', tone: 'success' });
  // Re-render to show frozen state
  window.dispatchEvent(new CustomEvent('pponto:refresh'));
}