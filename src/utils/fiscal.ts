/**
 * Fiscal file generators — Portaria MTE nº 671/2021 (Art. 83–87).
 *
 * Implements simplified, spec-shaped exporters for the Brazilian REP-P
 * fiscal files (AFD, AFDT, ACJEF) plus a payroll layout export. These are
 * structured text builders with the documented header/record shapes; the
 * SHA-256 digest represents the integrity hash used by certified REP systems.
 */
import type { AdjustmentRequest, Punch, User } from '../types.js';
import { pad2 } from './time.js';

// ─── Shared helpers ─────────────────────────────────────────

/** Two-digit NSR (sequential record number), padded. */
export function nsr(i: number): string {
  return String(i).padStart(9, '0');
}

/** "DDMMAAAA" from an ISO date string or Date. */
export function ddMMyyyy(v: string | Date): string {
  const d = typeof v === 'string' ? new Date(v) : v;
  return `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;
}

/** "HHMMSS" from an ISO timestamp or Date. */
export function hhmmss(v: string | Date): string {
  const d = typeof v === 'string' ? new Date(v) : v;
  return `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

/** CPF numeric-only (11 digits) or padded zeros. */
export function cpfDigits(cpf: string | null | undefined): string {
  if (!cpf) return '00000000000';
  return cpf.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
}

/** Right-fill a field to a fixed width (AAC-style). */
function field(value: string, width: number): string {
  return String(value).slice(0, width).padEnd(width, ' ');
}

/** Fiscal month label e.g. "202410" */
export function fiscalMonthKey(year: number, month0: number): string {
  return `${year}${pad2(month0 + 1)}`;
}

/** Deterministic fake SHA-256 (visual receipt hash — not real crypto). */
export function fakeSha256(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ h1, 0x85ebca6b) >>> 0;
  }
  const hex = (h1.toString(16) + h2.toString(16)).padStart(64, '0').slice(0, 64);
  return hex.replace(/[0-9a-f]/g, (c, idx) =>
    idx % 7 === 0 ? c.toUpperCase() : c,
  );
}

// ─── AFD (Arquivo Fonte de Dados) ──────────────────────────

export interface AfdRecord {
  /** 01 = marcação, 02 = ajuste manual, 03 = transferência REP */
  operation: '01' | '02' | '03';
  date: string; // ISO timestamp or date
  type: string; // 'E' entrada, 'S' saída, 'I' início intervalo, 'T' término intervalo
  cpf: string | null;
  nsrValue?: string;
}

/** Map a PunchType to the AFD "tipo de marcação" character. */
export function afdTypeChar(type: Punch['type']): string {
  switch (type) {
    case 'entry':
      return 'E';
    case 'exit':
      return 'S';
    case 'break_start':
      return 'I';
    case 'break_end':
      return 'T';
    default:
      return 'E';
  }
}

/**
 * Build a simplified AFD file (Art. 83 MTE).
 * Header + one line per punch in the required sequential format.
 */
export function buildAfd(
  company: { cnpj: string; name: string },
  punches: Punch[],
  usersById: Map<string, Pick<User, 'cpf'>>,
  year: number,
  month0: number,
): string {
  const month = fiscalMonthKey(year, month0);
  const lines: string[] = [];
  // Header record
  lines.push(
    [
      'AFD',
      field(company.cnpj.replace(/\D/g, '').padStart(14, '0'), 14),
      field(company.name, 50),
      month,
      field('PPONTO', 20),
      '1.0',
    ].join('|'),
  );

  let seq = 1;
  for (const p of punches) {
    const cpf = usersById.get(p.user_id)?.cpf ?? null;
    const nsrStr = nsr(seq);
    lines.push(
      [
        '1',
        nsrStr,
        afdTypeChar(p.type),
        hhmmss(p.timestamp),
        ddMMyyyy(p.timestamp),
        cpfDigits(cpf),
        field(p.source === 'rep' ? 'REP' : p.source.toUpperCase(), 10),
        field(p.id, 20),
      ].join('|'),
    );
    seq += 1;
  }

  // Trailer
  lines.push(['9', nsr(seq), String(punches.length)].join('|'));
  return `${lines.join('\n')}\n`;
}

// ─── AFDT (Arquivo Fonte Tratado) ──────────────────────────

export interface AfdtEntry {
  user: Pick<User, 'name' | 'cpf'>;
  date: string; // YYYY-MM-DD
  original: Record<string, string | null>; // type -> HH:mm
  adjusted?: Record<string, string | null>;
  justification?: string;
}

/**
 * Build a simplified AFDT file (Art. 84 MTE).
 * Mirrors original vs adjusted marks with abono/justification codes.
 */
export function buildAfdt(
  company: { cnpj: string; name: string },
  entries: AfdtEntry[],
  year: number,
  month0: number,
): string {
  const lines: string[] = [];
  lines.push(['AFDT', field(company.cnpj.replace(/\D/g, ''), 14), field(company.name, 50), fiscalMonthKey(year, month0)].join('|'));

  for (const e of entries) {
    const orig = e.original;
    const adj = e.adjusted ?? orig;
    lines.push(
      [
        '1',
        cpfDigits(e.user.cpf),
        field(e.user.name, 40),
        ddMMyyyy(new Date(e.date + 'T12:00:00')),
        orig.entry ?? '',
        orig.break_start ?? '',
        orig.break_end ?? '',
        orig.exit ?? '',
        adj.entry ?? '',
        adj.break_start ?? '',
        adj.break_end ?? '',
        adj.exit ?? '',
        field(e.justification ?? '', 40),
      ].join('|'),
    );
  }

  return `${lines.join('\n')}\n`;
}

// ─── ACJEF (Controle de Jornada) ───────────────────────────

export interface AcjefRow {
  user: Pick<User, 'name' | 'cpf'>;
  normalMinutes: number;
  overtime50: number;
  overtime100: number;
  nightAdditional: number;
  bankMinutes: number;
}

/**
 * Build a simplified ACJEF file (Art. 85 MTE).
 * Demonstrativo analítico mensal de jornadas.
 */
export function buildAcjef(
  company: { cnpj: string; name: string },
  rows: AcjefRow[],
  year: number,
  month0: number,
): string {
  const fmt = (min: number): string => {
    const sign = min < 0 ? '-' : '';
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(4, '0')}:${pad2(m)}`;
  };

  const lines: string[] = [];
  lines.push(['ACJEF', field(company.cnpj.replace(/\D/g, ''), 14), field(company.name, 50), fiscalMonthKey(year, month0)].join('|'));

  for (const r of rows) {
    lines.push(
      [
        '1',
        cpfDigits(r.user.cpf),
        field(r.user.name, 40),
        fmt(r.normalMinutes),
        fmt(r.overtime50),
        fmt(r.overtime100),
        fmt(r.nightAdditional),
        fmt(r.bankMinutes),
      ].join('|'),
    );
  }

  return `${lines.join('\n')}\n`;
}

// ─── Payroll layout export ─────────────────────────────────

export interface PayrollRow {
  user: Pick<User, 'name' | 'cpf'>;
  workedMinutes: number;
  overtime50: number;
  overtime100: number;
  absences: number;
  lateMinutes: number;
  bankMinutes: number;
}

/**
 * Build a payroll-integration layout (TOTVS/Protheus-friendly CSV).
 */
export function buildPayrollCsv(
  company: { cnpj: string; name: string },
  rows: PayrollRow[],
  year: number,
  month0: number,
): string {
  const header = ['CPF', 'Nome', 'Horas Trabalhadas', 'HE 50%', 'HE 100%', 'Faltas', 'Atrasos (min)', 'Saldo Banco'];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push(
      [
        cpfDigits(r.user.cpf),
        r.user.name,
        formatTimeMin(r.workedMinutes),
        formatTimeMin(r.overtime50),
        formatTimeMin(r.overtime100),
        String(r.absences),
        String(r.lateMinutes),
        formatTimeMin(r.bankMinutes),
      ].join(';'),
    );
  }
  const meta = `# pPonto — Layout Folha ${fiscalMonthKey(year, month0)} — CNPJ ${company.cnpj}`;
  return `${meta}\n${lines.join('\n')}\n`;
}

function formatTimeMin(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(totalMinutes);
  return `${sign}${Math.floor(abs / 60)}:${pad2(abs % 60)}`;
}

// ─── Download helper ───────────────────────────────────────

/**
 * Trigger a browser download of the generated fiscal file.
 * In non-browser (test) environments it returns the content for assertions.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
): string {
  if (typeof document === 'undefined') return content;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return content;
}

/** Default AFD/AFDT/ACJEF filenames per the MTE conventions. */
export function fiscalFilename(kind: 'AFD' | 'AFDT' | 'ACJEF', cnpj: string, year: number, month0: number): string {
  const digits = cnpj.replace(/\D/g, '').slice(0, 8);
  return `${kind}${digits}${fiscalMonthKey(year, month0)}.txt`;
}

/** Format an adjustment request as a printable AFDT entry note. */
export function adjustmentJustification(a: AdjustmentRequest): string {
  const parts = [a.reason];
  if (a.requested_entry) parts.push(`Entrada ${a.requested_entry}`);
  if (a.requested_exit) parts.push(`Saída ${a.requested_exit}`);
  return parts.join(' — ').slice(0, 80);
}

/** Short RFC-ish timestamp for audit trails ("2026-09-11T14:05:33Z"). */
export function auditStamp(): string {
  return new Date().toISOString();
}