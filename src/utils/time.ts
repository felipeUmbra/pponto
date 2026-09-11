/**
 * Date/time + geo helpers shared across mobile & admin views.
 * Clock display uses Brasília (America/Sao_Paulo); punch timestamps
 * are stored as ISO UTC and rendered in the device-local timezone.
 */
import type { PunchType } from '../types.js';

// ─── Punch metadata ─────────────────────────────────────────

export const PUNCH_ORDER: PunchType[] = ['entry', 'break_start', 'break_end', 'exit'];

export const PUNCH_LABELS: Record<PunchType, string> = {
  entry: 'Entrada',
  break_start: 'Int. Saída',
  break_end: 'Int. Retorno',
  exit: 'Saída Final',
};

export const PUNCH_SHORT_LABELS: Record<PunchType, string> = {
  entry: '1ª Entrada',
  break_start: '1ª Saída',
  break_end: '2ª Entrada',
  exit: '2ª Saída',
};

export const PUNCH_CTA_LABELS: Record<PunchType, string> = {
  entry: 'Entrada do Dia',
  break_start: 'Saída Intervalo de Almoço',
  break_end: 'Retorno Intervalo de Almoço',
  exit: 'Saída Final do Expediente',
};

// ─── Formatting helpers ─────────────────────────────────────

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "08:58" from ISO timestamp or Date (device-local). */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "08:58:12" */
export function formatSeconds(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** "Quinta-feira, 24 de Outubro de 2024" */
export function formatLongDate(d: Date = new Date()): string {
  const s = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Quinta-feira" */
export function weekdayLabel(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Outubro de 2024" */
export function monthLabel(year: number, month0: number): string {
  const s = new Date(year, month0, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "24/10" */
export function shortDay(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

/** "01/10/2024 a 31/10/2024" */
export function fullDateRange(year: number, month0: number): string {
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const fmt = (d: Date): string =>
    `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${fmt(first)} a ${fmt(last)}`;
}

/** YYYY-MM-DD key (device-local). */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// ─── Time math (minutes since midnight) ─────────────────────

/** "08:15" → 495 */
export function parseHHmm(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 495 → "08:15" */
export function minutesToHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/** 495 → "08h 15m" */
export function formatDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(totalMinutes);
  return `${sign}${Math.floor(abs / 60)}h ${pad2(abs % 60)}m`;
}

/** 405 → "+06h 45m", -70 → "-01h 10m" */
export function formatBank(totalMinutes: number): string {
  const sign = totalMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(totalMinutes);
  return `${sign}${Math.floor(abs / 60)}h ${pad2(abs % 60)}m`;
}

/** Minutes between two HH:mm strings (handles overnight end). */
export function diffMinutes(startHHmm: string, endHHmm: string): number {
  const s = parseHHmm(startHHmm);
  const e = parseHHmm(endHHmm);
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

/** Minutes between two ISO timestamps. */
export function durationBetween(startIso: string, endIso: string): number {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

/**
 * Total worked minutes from the 4 daily slots:
 * (entry → break_start) + (break_end → exit).
 */
export function computeWorkedMinutes(slots: Record<PunchType, string | null>): number {
  let total = 0;
  if (slots.entry && slots.break_start) {
    total += diffMinutes(slots.entry, slots.break_start);
  }
  if (slots.break_end && slots.exit) {
    total += diffMinutes(slots.break_end, slots.exit);
  }
  return total;
}

/**
 * Next expected punch type given today's registered types,
 * or null when the shift is fully registered.
 */
export function nextPunchType(types: PunchType[]): PunchType | null {
  for (const t of PUNCH_ORDER) {
    if (!types.includes(t)) return t;
  }
  return null;
}

// ─── Geo helpers ────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters (Haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}