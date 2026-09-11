import { describe, it, expect } from 'vitest';
import {
  buildAfd,
  buildAfdt,
  buildAcjef,
  buildPayrollCsv,
  nsr,
  ddMMyyyy,
  hhmmss,
  cpfDigits,
  afdTypeChar,
  fiscalFilename,
  fakeSha256,
} from './fiscal.js';
import type { Punch } from '../types.js';

const company = { cnpj: '45.928.110/0001-92', name: 'Umbran Digital Ltda' };

function mkPunch(id: string, type: Punch['type'], hh: number, mm: number): Punch {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return {
    id,
    user_id: 'usr-1',
    timestamp: d.toISOString(),
    type,
    photo_url: null,
    latitude: -23.5912,
    longitude: -46.683,
    gps_accuracy: 12,
    geofence_id: null,
    source: 'mobile',
    offline_synced: 1,
    sync_queue_id: null,
    created_at: d.toISOString(),
  };
}

describe('fiscal helpers', () => {
  it('nsr pads to 9 digits', () => {
    expect(nsr(1)).toBe('000000001');
    expect(nsr(10928)).toBe('000010928');
  });

  it('formats dates and times for AFD', () => {
    const d = new Date('2024-10-15T08:04:12-03:00');
    expect(ddMMyyyy(d)).toBe('15102024');
    // Use local time for hhmmss
    expect(hhmmss(d)).toMatch(/^\d{6}$/);
  });

  it('cpfDigits strips formatting and pads', () => {
    expect(cpfDigits('354.702.910-12')).toBe('35470291012');
    expect(cpfDigits(null)).toBe('00000000000');
    expect(cpfDigits('123')).toBe('00000000123');
  });

  it('afdTypeChar maps punch types', () => {
    expect(afdTypeChar('entry')).toBe('E');
    expect(afdTypeChar('exit')).toBe('S');
    expect(afdTypeChar('break_start')).toBe('I');
    expect(afdTypeChar('break_end')).toBe('T');
  });

  it('fiscalFilename follows MTE conventions', () => {
    expect(fiscalFilename('AFD', company.cnpj, 2024, 9)).toMatch(/^AFD\d{8}202410\.txt$/);
  });

  it('fakeSha256 returns a 64-char hex string', () => {
    const h = fakeSha256('test-input');
    expect(h).toMatch(/^[0-9A-Fa-f]{64}$/);
    expect(fakeSha256('test-input')).toBe(h); // deterministic
  });
});

describe('AFD builder', () => {
  it('builds header + punch lines + trailer', () => {
    const punches = [mkPunch('p1', 'entry', 8, 4), mkPunch('p2', 'exit', 18, 2)];
    const usersById = new Map([['usr-1', { cpf: '354.702.910-12' }]]);
    const out = buildAfd(company, punches, usersById, 2024, 9);

    const lines = out.trim().split('\n');
    expect(lines[0]!.startsWith('AFD|45928110000192|Umbran Digital Ltda')).toBe(true);
    expect(lines[1]!.startsWith('1|000000001|E|')).toBe(true);
    expect(lines[2]!.startsWith('1|000000002|S|')).toBe(true);
    expect(lines[3]!.startsWith('9|000000003|')).toBe(true);
  });
});

describe('AFDT builder', () => {
  it('mirrors original vs adjusted marks', () => {
    const out = buildAfdt(
      company,
      [
        {
          user: { name: 'Ana Souza', cpf: '354.702.910-12' },
          date: '2024-10-01',
          original: { entry: '08:00', break_start: '12:00', break_end: '13:00', exit: '18:00' },
          adjusted: { entry: '08:05', break_start: '12:00', break_end: '13:00', exit: '18:00' },
          justification: 'Ajuste manual justificado',
        },
      ],
      2024,
      9,
    );
    expect(out.startsWith('AFDT|')).toBe(true);
    expect(out).toContain('35470291012');
    expect(out).toContain('08:05');
    expect(out).toContain('Ajuste manual justificado');
  });
});

describe('ACJEF + payroll', () => {
  it('builds ACJEF with HH:MM formatting', () => {
    const out = buildAcjef(
      company,
      [{ user: { name: 'Ana Souza', cpf: '35470291012' }, normalMinutes: 480, overtime50: 30, overtime100: 0, nightAdditional: 0, bankMinutes: 30 }],
      2024,
      9,
    );
    expect(out.startsWith('ACJEF|')).toBe(true);
    expect(out).toContain('0008:00');
    expect(out).toContain('0000:30');
  });

  it('builds payroll CSV with header + row', () => {
    const out = buildPayrollCsv(
      company,
      [{ user: { name: 'Ana Souza', cpf: '35470291012' }, workedMinutes: 510, overtime50: 30, overtime100: 0, absences: 0, lateMinutes: 5, bankMinutes: 30 }],
      2024,
      9,
    );
    const lines = out.trim().split('\n');
    expect(lines[0]!.startsWith('# pPonto — Layout Folha')).toBe(true);
    expect(lines[1]!).toBe('CPF;Nome;Horas Trabalhadas;HE 50%;HE 100%;Faltas;Atrasos (min);Saldo Banco');
    expect(lines[2]!).toContain('35470291012');
    expect(lines[2]!).toContain('8:30');
  });
});