/**
 * Admin dashboard — live KPIs + punch treatment table + certificate queue.
 * Matches Stitch screen #01 design.
 */
import {
  listAdminUsers,
  getAdminStats,
  listPendingCertificates,
  listPendingAdjustments,
} from '../../api/data.js';
import type { MedicalCertificate, AdjustmentRequest } from '../../types.js';

export async function renderDashboard(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando dados…</p>';

  try {
    const [stats, users, certificates, adjustments] = await Promise.all([
      getAdminStats(),
      listAdminUsers(),
      listPendingCertificates(),
      listPendingAdjustments(),
    ]);

    el.innerHTML = '';

    // ── Sub-header ──
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm';
    header.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Tratamento de Ponto &amp; Ocorrências</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-light/10 text-teal-success border border-emerald-light/20">Período Aberto</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">
          Existem <strong class="text-ruby-danger">${stats.inconsistencies > 0 ? stats.inconsistencies : '—'} divergências</strong> e
          <strong class="text-amber-warning">${stats.pendingCount} solicitações</strong> aguardando validação.
        </p>
      </div>`;
    el.appendChild(header);

    // ── KPI grid ──
    const kpiGrid = document.createElement('section');
    kpiGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    kpiGrid.innerHTML = `
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Presentes Hoje</p>
        <p class="text-headline-lg font-bold text-on-surface">${stats.presentToday} / ${stats.totalUsers}</p>
        <p class="text-caption text-teal-success">${Math.round((stats.presentToday / Math.max(stats.totalUsers, 1)) * 100)}% aderência</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Atestados Pendentes</p>
        <p class="text-headline-lg font-bold text-amber-warning">${stats.pendingCertificates}</p>
        <p class="text-caption text-outline">Aguardando análise RH</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Ajustes Pendentes</p>
        <p class="text-headline-lg font-bold text-ruby-danger">${stats.pendingAdjustments}</p>
        <p class="text-caption text-outline">Solicitações de correção</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Divergências</p>
        <p class="text-headline-lg font-bold text-purple-bank">${stats.inconsistencies}</p>
        <p class="text-caption text-outline">Batidas incompletas</p>
      </div>`;
    el.appendChild(kpiGrid);

    // ── Two-column: Treatment table + Certificate queue ──
    const twoCol = document.createElement('section');
    twoCol.className = 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start';

    // Treatment table (left)
    twoCol.appendChild(renderTreatmentTable(users));
    // Certificate & adjustment sidebar (right)
    twoCol.appendChild(renderSideQueue(certificates, adjustments));

    el.appendChild(twoCol);
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderTreatmentTable(users: Awaited<ReturnType<typeof listAdminUsers>>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'xl:col-span-8 bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col';
  wrap.innerHTML = `
    <div class="p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-headline-sm font-bold text-on-surface">Tratamento de Ocorrências e Batidas</h2>
        <p class="text-caption text-outline">Ajustes manuais com justificativa legal para espelho fiscal</p>
      </div>
    </div>`;

  const tableWrap = document.createElement('div');
  tableWrap.className = 'overflow-x-auto';
  const table = document.createElement('table');
  table.className = 'w-full text-left border-collapse';
  table.innerHTML = `
    <thead>
      <tr class="bg-slate-50 border-b border-border-subtle text-caption text-outline uppercase tracking-wider">
        <th class="py-3 px-4 font-semibold">Colaborador</th>
        <th class="py-3 px-3 font-semibold">Jornada</th>
        <th class="py-3 px-3 font-semibold">Batidas Hoje</th>
        <th class="py-3 px-3 font-semibold">Status</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-border-subtle text-body-sm"></tbody>`;
  const tbody = table.querySelector('tbody')!;

  for (const u of users) {
    const slots = ['entry', 'break_start', 'break_end', 'exit'] as const;
    const slotValues = slots.map((s) => {
      const punch = u.todayPunches.find((p) => p.type === s);
      if (s === 'exit' && u.inconsistency === 'missing_exit' && !punch) {
        return `<span class="px-1.5 py-0.5 bg-error-container text-ruby-danger border border-ruby-danger/30 rounded font-semibold">--:--</span>`;
      }
      if (s === 'entry' && u.inconsistency === 'missing_entry') {
        return `<span class="px-1.5 py-0.5 bg-error-container text-ruby-danger border border-ruby-danger/30 rounded font-semibold">--:--</span>`;
      }
      const time = punch ? new Date(punch.timestamp).toTimeString().slice(0, 5) : '--:--';
      return `<span class="px-1.5 py-0.5 bg-neutral-canvas border border-border-subtle rounded">${time}</span>`;
    });

    const statusBadge = u.inconsistency === 'missing_exit'
      ? '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-red-50 text-ruby-danger border border-red-200"><span class="material-symbols-outlined text-xs">error</span><span>Falta Saída</span></span>'
      : u.inconsistency === 'missing_entry'
        ? '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-red-50 text-ruby-danger border border-red-200"><span class="material-symbols-outlined text-xs">error</span><span>Falta Entrada</span></span>'
        : u.todayPunches.length === 0
          ? '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-slate-100 text-outline border border-border-subtle"><span>—</span></span>'
          : '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-emerald-light/10 text-teal-success border border-emerald-light/20"><span class="material-symbols-outlined text-xs">check</span><span>OK</span></span>';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-neutral-canvas/70 transition-colors';
    tr.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-vibrant flex items-center justify-center text-white text-xs font-bold">${u.user.name.charAt(0)}</div>
          <div>
            <div class="font-semibold text-on-surface leading-snug">${u.user.name}</div>
            <div class="text-caption text-outline">${u.user.role === 'admin' ? 'Admin' : u.user.role === 'rh' ? 'RH' : u.user.role === 'manager' ? 'Gestor' : 'Colaborador'}</div>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-3 text-on-surface-variant font-tabular-time">${u.scheduleName}</td>
      <td class="py-3.5 px-3">
        <div class="flex items-center space-x-1.5 font-tabular-time text-on-surface">
          ${slotValues.join('<span class="text-outline">→</span>')}
        </div>
      </td>
      <td class="py-3.5 px-3">${statusBadge}</td>`;
    tbody.appendChild(tr);
  }

  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
  return wrap;
}

function renderSideQueue(
  certificates: MedicalCertificate[],
  adjustments: AdjustmentRequest[],
): HTMLElement {
  const side = document.createElement('div');
  side.className = 'xl:col-span-4 space-y-5';

  // Certificate queue
  const certCard = document.createElement('div');
  certCard.className = 'bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-sm';
  certCard.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-border-subtle">
      <div class="flex items-center space-x-2">
        <span class="material-symbols-outlined text-ruby-danger">medical_services</span>
        <h3 class="text-headline-sm font-bold text-on-surface">Fila de Atestados</h3>
      </div>
      <span class="px-2 py-0.5 bg-ruby-danger/10 text-ruby-danger rounded-full text-caption font-bold">${certificates.length}</span>
    </div>`;

  const certList = document.createElement('div');
  certList.className = 'mt-4 space-y-3';

  if (certificates.length === 0) {
    certList.innerHTML = '<p class="text-caption text-outline text-center py-4">Nenhum atestado pendente</p>';
  } else {
    for (const c of certificates.slice(0, 3)) {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-lg border border-border-subtle bg-neutral-canvas/60 hover:bg-neutral-canvas transition-colors flex flex-col space-y-2';
      item.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <div class="text-body-sm font-semibold text-on-surface">${c.description ?? 'Atestado médico'}</div>
            <div class="text-caption text-outline">Período: ${c.start_date}${c.end_date !== c.start_date ? ' a ' + c.end_date : ''}</div>
          </div>
          <span class="text-caption text-outline font-tabular-time">${new Date(c.uploaded_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button class="py-1 px-3 bg-emerald-light hover:bg-teal-success text-surface-container-lowest rounded text-caption font-semibold flex items-center justify-center space-x-1 transition-colors cert-approve" data-id="${c.id}">
            <span class="material-symbols-outlined text-sm">check</span><span>Aprovar</span>
          </button>
          <button class="py-1 px-3 bg-surface-container-lowest hover:bg-neutral-canvas border border-border-subtle text-ruby-danger rounded text-caption font-medium flex items-center justify-center space-x-1 transition-colors cert-reject" data-id="${c.id}">
            <span class="material-symbols-outlined text-sm">close</span><span>Rejeitar</span>
          </button>
        </div>`;
      certList.appendChild(item);
    }
  }
  certCard.appendChild(certList);
  side.appendChild(certCard);

  // Adjustment queue mini
  const adjCard = document.createElement('div');
  adjCard.className = 'bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-sm';
  adjCard.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-border-subtle">
      <div class="flex items-center space-x-2">
        <span class="material-symbols-outlined text-blue-vibrant">edit_calendar</span>
        <h3 class="text-headline-sm font-bold text-on-surface">Ajustes Pendentes</h3>
      </div>
      <span class="px-2 py-0.5 bg-blue-vibrant/10 text-blue-vibrant rounded-full text-caption font-bold">${adjustments.length}</span>
    </div>`;

  const adjList = document.createElement('div');
  adjList.className = 'mt-4 space-y-3';
  if (adjustments.length === 0) {
    adjList.innerHTML = '<p class="text-caption text-outline text-center py-4">Nenhum ajuste pendente</p>';
  } else {
    for (const a of adjustments.slice(0, 3)) {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-lg border border-border-subtle bg-neutral-canvas/60';
      const correction = a.requested_exit
        ? `Saída ${a.requested_exit}`
        : a.requested_entry
          ? `Entrada ${a.requested_entry}`
          : 'Correção';
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <div class="text-body-sm font-semibold text-on-surface">${correction}</div>
            <div class="text-caption text-outline">${a.punch_date} — ${a.reason.slice(0, 40)}${a.reason.length > 40 ? '…' : ''}</div>
          </div>
          <span class="text-caption text-outline font-tabular-time">${new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
        </div>`;
      adjList.appendChild(item);
    }
  }
  adjCard.appendChild(adjList);
  side.appendChild(adjCard);

  return side;
}
