/**
 * Reusable 4-slot punch grid card (Entrada | Int. Saída | Int. Retorno | Saída Final).
 * Mirrors the Stitch espelho / punch timeline design.
 */
import type { PunchType } from '../types.js';
import { PUNCH_LABELS } from '../utils/time.js';

export interface PunchSlotStyle {
  label: string;
  time: string | null;
  state: 'done' | 'next' | 'pending' | 'error';
  hint?: string;
}

/**
 * Build the 4-col slot grid. `slots` is keyed in PUNCH_ORDER.
 */
export function renderPunchSlots(slots: Record<PunchType, PunchSlotStyle>): HTMLElement {
  const rows: [PunchType, PunchSlotStyle][] = [
    ['entry', slots.entry],
    ['break_start', slots.break_start],
    ['break_end', slots.break_end],
    ['exit', slots.exit],
  ];

  const grid = document.createElement('div');
  grid.className =
    'grid grid-cols-4 gap-1.5 bg-neutral-canvas p-2.5 rounded-lg border border-border-subtle text-center';

  for (const [type, slot] of rows) {
    const cell = document.createElement('div');
    const label = slot.label || PUNCH_LABELS[type];

    if (slot.state === 'done') {
      cell.innerHTML = `
        <span class="text-caption text-outline block mb-0.5">${label}</span>
        <span class="text-tabular-time font-semibold text-navy-deep">${slot.time ?? '--:--'}</span>`;
    } else if (slot.state === 'next') {
      cell.className = 'bg-blue-accent/5 rounded border border-dashed border-blue-accent/40';
      cell.innerHTML = `
        <span class="text-caption text-blue-accent block mb-0.5">${label}</span>
        <span class="text-tabular-time font-semibold text-blue-vibrant">${slot.time ?? '--:--'}</span>`;
    } else if (slot.state === 'error') {
      cell.className = 'bg-ruby-danger/10 rounded border border-dashed border-ruby-danger/40';
      cell.innerHTML = `
        <span class="text-caption text-ruby-danger block mb-0.5">${label}</span>
        <span class="text-tabular-time font-bold text-ruby-danger flex items-center justify-center gap-0.5">
          <span class="material-symbols-outlined text-[13px]">error</span>
          ${slot.time ?? '--:--'}
        </span>`;
    } else {
      // pending
      cell.className = 'opacity-60';
      cell.innerHTML = `
        <span class="text-caption text-outline block mb-0.5">${label}</span>
        <span class="text-tabular-time font-medium text-outline">${slot.time ?? '--:--'}</span>
        ${slot.hint ? `<span class="text-caption text-outline block">${slot.hint}</span>` : ''}`;
    }

    grid.appendChild(cell);
  }

  return grid;
}

/**
 * Build the 2x2 "Registros de Hoje" grid used on the punch view
 * (uses shorter labels + status marks).
 */
export function renderTodayGrid(
  slots: Record<PunchType, { time: string | null; done: boolean; next?: boolean }>,
): HTMLElement {
  const order: PunchType[] = ['entry', 'break_start', 'break_end', 'exit'];
  const shortLabels: Record<PunchType, string> = {
    entry: '1ª Entrada',
    break_start: '1ª Saída',
    break_end: '2ª Entrada',
    exit: '2ª Saída',
  };

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-2.5';

  for (const type of order) {
    const s = slots[type];
    const card = document.createElement('div');

    if (s.next) {
      card.className =
        'p-2.5 rounded-lg bg-secondary-fixed/30 border-2 border-blue-accent/60 flex flex-col justify-between relative overflow-hidden';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-caption font-semibold text-secondary uppercase">${shortLabels[type]}</span>
          <span class="bg-blue-vibrant text-white text-badge-label px-1.5 py-0.2 rounded animate-pulse">Agora</span>
        </div>
        <div class="flex items-baseline justify-between mt-1">
          <span class="text-tabular-time text-blue-vibrant font-bold text-[1rem]">--:--</span>
          <span class="text-caption text-secondary font-medium">Aguardando</span>
        </div>`;
    } else if (s.done) {
      card.className =
        'p-2.5 rounded-lg bg-surface-container-low border border-border-subtle flex flex-col justify-between';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-caption text-on-surface-variant uppercase font-medium">${shortLabels[type]}</span>
          <span class="bg-emerald-light/10 text-teal-success text-badge-label px-1.5 py-0.2 rounded flex items-center">
            <span class="material-symbols-outlined text-[12px] mr-0.5">check</span> OK
          </span>
        </div>
        <div class="flex items-baseline justify-between mt-1">
          <span class="text-tabular-time text-navy-deep font-semibold">${s.time ?? '--:--'}</span>
          <div class="flex items-center text-outline text-caption" title="Comprovante e foto biométrica anexados">
            <span class="material-symbols-outlined text-[14px]">photo_camera</span>
            <span class="material-symbols-outlined text-[14px] ml-0.5">pin_drop</span>
          </div>
        </div>`;
    } else {
      card.className =
        'p-2.5 rounded-lg bg-neutral-card border border-dashed border-border-subtle flex flex-col justify-between opacity-60';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-caption text-outline uppercase font-medium">${shortLabels[type]}</span>
          <span class="text-caption text-outline">Prev. ${s.time ?? '--:--'}</span>
        </div>
        <div class="flex items-baseline justify-between mt-1">
          <span class="text-tabular-time text-outline font-medium">--:--</span>
          <span class="material-symbols-outlined text-outline text-[14px]">lock_clock</span>
        </div>`;
    }

    grid.appendChild(card);
  }

  return grid;
}