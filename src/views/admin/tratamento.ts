/**
 * Tratamento de Ponto — admin punch validation.
 * Matches Stitch screen #01 main area.
 */
import { listAdminUsers } from '../../api/data.js';
import type { AdminUserRow } from '../../api/data.js';

export async function renderTratamento(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando dados…</p>';

  try {
    const users = await listAdminUsers();
    el.innerHTML = '';

    // Header
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm';
    const withDivergences = users.filter((u) => u.inconsistency !== 'none').length;
    header.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Tratamento de Ponto</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-light/10 text-teal-success border border-emerald-light/20">Período Aberto</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">
          <strong class="text-ruby-danger">${withDivergences} divergências</strong> detectadas na apuração de hoje.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center space-x-2 bg-neutral-canvas border border-border-subtle rounded-lg px-3 py-2 text-body-sm">
          <span class="material-symbols-outlined text-outline">calendar_month</span>
          <span class="font-medium text-on-surface">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
      </div>`;
    el.appendChild(header);

    // Summary chips
    const chips = document.createElement('div');
    chips.className = 'flex flex-wrap gap-2';
    const chipData = [
      { label: 'Com divergência', value: withDivergences, cls: 'bg-ruby-danger/10 text-ruby-danger border border-ruby-danger/30' },
      { label: 'Sem registro hoje', value: users.filter((u) => u.todayPunches.length === 0).length, cls: 'bg-amber-soft/10 text-amber-warning border border-amber-soft/30' },
      { label: 'Jornada completa', value: users.filter((u) => u.todayPunches.length > 0 && u.inconsistency === 'none').length, cls: 'bg-emerald-light/10 text-teal-success border border-emerald-light/30' },
    ];
    for (const c of chipData) {
      const chip = document.createElement('span');
      chip.className = `inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-caption font-semibold ${c.cls}`;
      chip.innerHTML = `<span>${c.label}</span><strong>${c.value}</strong>`;
      chips.appendChild(chip);
    }
    el.appendChild(chips);

    // Table
    el.appendChild(renderTable(users));
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderTable(users: AdminUserRow[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden';
  wrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-border-subtle text-caption text-outline uppercase tracking-wider">
            <th class="py-3 px-4 font-semibold">Colaborador</th>
            <th class="py-3 px-3 font-semibold">Jornada</th>
            <th class="py-3 px-3 font-semibold">Batidas</th>
            <th class="py-3 px-3 font-semibold">Divergência</th>
            <th class="py-3 px-3 font-semibold">Trabalhado</th>
            <th class="py-3 px-4 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle text-body-sm"></tbody>
      </table>
    </div>`;
  const tbody = wrap.querySelector('tbody')!;

  for (const u of users) {
    const slots = ['entry', 'break_start', 'break_end', 'exit'] as const;
    const slotHtml = slots
      .map((s) => {
        const punch = u.todayPunches.find((p) => p.type === s);
        const time = punch ? new Date(punch.timestamp).toTimeString().slice(0, 5) : '--:--';
        const highlight =
          (s === 'exit' && u.inconsistency === 'missing_exit') ||
          (s === 'entry' && u.inconsistency === 'missing_entry');
        return `<span class="px-1.5 py-0.5 bg-neutral-canvas border ${highlight ? 'bg-error-container text-ruby-danger border-ruby-danger/30 font-semibold' : 'border-border-subtle'} rounded">${time}</span>`;
      })
      .join('<span class="text-outline">→</span>');

    const badge =
      u.inconsistency === 'missing_exit'
        ? '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-red-50 text-ruby-danger border border-red-200"><span class="material-symbols-outlined text-xs">error</span><span>Batida Ímpar (Falta Saída)</span></span>'
        : u.inconsistency === 'missing_entry'
          ? '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-red-50 text-ruby-danger border border-red-200"><span class="material-symbols-outlined text-xs">error</span><span>Falta Entrada</span></span>'
          : '<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-caption bg-emerald-light/10 text-teal-success border border-emerald-light/20"><span class="material-symbols-outlined text-xs">check</span><span>OK</span></span>';

    const worked = `${Math.floor(u.workedMinutesToday / 60)}h ${String(u.workedMinutesToday % 60).padStart(2, '0')}m`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-neutral-canvas/70 transition-colors';
    tr.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-vibrant flex items-center justify-center text-white text-xs font-bold">${u.user.name.charAt(0)}</div>
          <div>
            <div class="font-semibold text-on-surface leading-snug">${u.user.name}</div>
            <div class="text-caption text-outline">${u.user.role === 'admin' ? 'Admin' : u.user.role === 'rh' ? 'RH' : u.user.role === 'manager' ? 'Gestor' : 'Colaborador'} • ${u.user.department_id ?? '—'}</div>
          </div>
        </div>
      </td>
      <td class="py-3.5 px-3 text-on-surface-variant font-tabular-time">${u.scheduleName}</td>
      <td class="py-3.5 px-3"><div class="flex items-center space-x-1.5 font-tabular-time">${slotHtml}</div></td>
      <td class="py-3.5 px-3">${badge}</td>
      <td class="py-3.5 px-3 font-tabular-time text-on-surface">${u.todayPunches.length > 0 ? worked : '—'}</td>
      <td class="py-3.5 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center space-x-1.5">
          ${u.inconsistency !== 'none'
            ? '<button class="p-1.5 text-blue-vibrant hover:bg-surface-container-low rounded border border-blue-accent/30 font-medium text-caption flex items-center space-x-1" title="Incluir Batida"><span class="material-symbols-outlined text-sm">edit_calendar</span><span>Ajustar</span></button>'
            : '<span class="text-caption text-outline">—</span>'}
        </div>
      </td>`;
    tbody.appendChild(tr);
  }

  return wrap;
}