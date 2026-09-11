import { describe, it, expect } from 'vitest';
import {
  pad2,
  formatTime,
  formatSeconds,
  formatLongDate,
  formatDuration,
  formatBank,
  minutesToHHmm,
  parseHHmm,
  diffMinutes,
  durationBetween,
  computeWorkedMinutes,
  nextPunchType,
  haversineMeters,
  dateKey,
  parseDateKey,
  monthLabel,
  fullDateRange,
  PUNCH_ORDER,
} from './time.js';

describe('pad2 / formatting', () => {
  it('pads single digits', () => {
    expect(pad2(4)).toBe('04');
    expect(pad2(12)).toBe('12');
  });

  it('formats HH:mm from ISO', () => {
    // Local timezone-dependent; construct Date directly
    const d = new Date(2024, 9, 24, 8, 58, 0);
    expect(formatTime(d)).toBe('08:58');
  });

  it('formats seconds', () => {
    const d = new Date(2024, 9, 24, 23, 17, 57);
    expect(formatSeconds(d)).toBe('23:17:57');
  });

  it('formats long date pt-BR', () => {
    const d = new Date(2024, 9, 24);
    expect(formatLongDate(d)).toBe('Quinta-feira, 24 de outubro de 2024');
  });

  it('formats duration and bank', () => {
    expect(formatDuration(495)).toBe('8h 15m');
    expect(formatDuration(-70)).toBe('-1h 10m');
    expect(formatBank(405)).toBe('+6h 45m');
    expect(formatBank(-70)).toBe('-1h 10m');
  });
});

describe('time math', () => {
  it('converts HH:mm both ways', () => {
    expect(parseHHmm('08:15')).toBe(495);
    expect(parseHHmm('08:15:99')).toBeNaN();
    expect(minutesToHHmm(495)).toBe('08:15');
    expect(minutesToHHmm(0)).toBe('00:00');
    expect(minutesToHHmm(1440)).toBe('24:00');
  });

  it('handles overnight diffs', () => {
    expect(diffMinutes('08:00', '12:00')).toBe(240);
    expect(diffMinutes('22:00', '06:00')).toBe(480);
    expect(diffMinutes('09:00', '09:00')).toBe(0);
  });

  it('durationBetween returns minutes', () => {
    const a = '2024-10-24T11:00:00.000Z';
    const b = '2024-10-24T12:15:00.000Z';
    expect(durationBetween(a, b)).toBe(75);
  });

  it('computeWorkedMinutes sums both work blocks', () => {
    const slots = {
      entry: '08:58',
      break_start: '12:01',
      break_end: '13:02',
      exit: '18:15',
    };
    expect(computeWorkedMinutes(slots)).toBe(183 + 313); // 8h 15m
  });

  it('nextPunchType follows order and returns null when complete', () => {
    expect(nextPunchType([])).toBe('entry');
    expect(nextPunchType(['entry'])).toBe('break_start');
    expect(nextPunchType(['entry', 'break_start', 'break_end'])).toBe('exit');
    expect(nextPunchType([...PUNCH_ORDER])).toBeNull();
  });
});

describe('geo', () => {
  it('haversine returns ~0 for same point', () => {
    expect(haversineMeters(-23.5912, -46.683, -23.5912, -46.683)).toBeLessThan(1);
  });

  it('haversine ≈ known distance (1° lat ≈ 111 km)', () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('date keys', () => {
  it('dateKey → YYYY-MM-DD and parseDateKey round-trips', () => {
    const d = new Date(2024, 9, 24);
    expect(dateKey(d)).toBe('2024-10-24');
    const back = parseDateKey('2024-10-24');
    expect(back.getFullYear()).toBe(2024);
    expect(back.getMonth()).toBe(9);
    expect(back.getDate()).toBe(24);
  });

  it('monthLabel and fullDateRange', () => {
    expect(monthLabel(2024, 9)).toBe('Outubro de 2024');
    expect(fullDateRange(2024, 9)).toBe('01/10/2024 a 31/10/2024');
  });
});