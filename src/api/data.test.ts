import { describe, it, expect } from 'vitest';
import {
  getUserWithSchedule,
  getPunchesInRange,
  getTodayPunches,
  getCertificates,
  getAdjustments,
  getGeofences,
  insertPunch,
  insertAdjustment,
  summarizeMonth,
  nextPunchForToday,
  HAS_TURSO,
  listDepartments,
  listAllGeofences,
  insertGeofence,
  updateGeofence,
  toggleGeofence,
  deleteGeofence,
  getAdminReport,
  businessDaysInMonth,
} from './data.js';

// These tests run against the built-in demo dataset (no Turso credentials
// in the test environment), so they don't perform network calls.

describe('demo data layer', () => {
  it('demo dataset is enabled without credentials', () => {
    expect(HAS_TURSO).toBe(false);
  });

  it('returns a user with schedule', async () => {
    const u = await getUserWithSchedule('usr-demo-1');
    expect(u.name).toBe('Ana Beatriz Souza');
    expect(u.scheduleName).toBeDefined();
    expect(u.role).toBe('employee');
  });

  it('returns today punches and derives the next expected type', async () => {
    const today = await getTodayPunches('usr-demo-1');
    const { next, today: t2 } = await nextPunchForToday('usr-demo-1');
    expect(today.length).toBe(t2.length);
    // seed has entry + break_start for today
    expect(next).toBe('break_end');
  });

  it('filters punches by range', async () => {
    const start = new Date();
    start.setDate(start.getDate() - 10);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const rows = await getPunchesInRange('usr-demo-1', start.toISOString(), end.toISOString());
    // 4 seeded days × full punches (2 today + 4 yesterday + 3 (22/10) + 4 (5 ago))
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('returns certificates and adjustments for user', async () => {
    const certs = await getCertificates('usr-demo-1');
    expect(certs.length).toBe(2);
    // newest first (pending one uploaded 30h ago > approved 120h ago)
    expect(certs[0]!.status).toBe('pending');
    expect(certs.some((c) => c.status === 'approved')).toBe(true);

    const adjs = await getAdjustments('usr-demo-1');
    expect(adjs.length).toBe(2);
    expect(adjs[0]!.status).toBe('pending');
  });

  it('returns active geofences', async () => {
    const fences = await getGeofences('cmp-001');
    expect(fences.length).toBeGreaterThan(0);
    expect(fences.some((f) => f.active === 1)).toBe(true);
  });

  it('inserts a punch into the local store', async () => {
    const before = (await getTodayPunches('usr-demo-1')).length;
    const id = await insertPunch({
      userId: 'usr-demo-1',
      type: 'break_end',
      timestamp: new Date().toISOString(),
      photoUrl: null,
      latitude: -23.5912,
      longitude: -46.683,
      gpsAccuracy: 15,
      geofenceId: 'gf-001',
      source: 'mobile',
    });
    expect(id).toBeTruthy();
    const after = (await getTodayPunches('usr-demo-1')).length;
    expect(after).toBe(before + 1);
  });

  it('inserts an adjustment request', async () => {
    const before = (await getAdjustments('usr-demo-1')).length;
    await insertAdjustment({
      userId: 'usr-demo-1',
      punchDate: '2024-10-25',
      requestedEntry: null,
      requestedExit: '18:30',
      reason: 'Reunião extra com cliente ao final do expediente.',
    });
    const after = (await getAdjustments('usr-demo-1')).length;
    expect(after).toBe(before + 1);
  });
});

describe('summarizeMonth', () => {
  it('computes totals, bank and inconsistencies', async () => {
    const punches = await getPunchesInRange('usr-demo-1', '2000-01-01T00:00:00Z', '2999-12-31T23:59:59Z');
    const certs = await getCertificates('usr-demo-1');
    const stats = summarizeMonth(punches, certs);

    expect(stats.workedDays).toBeGreaterThan(0);
    expect(stats.workedMinutes).toBeGreaterThan(0);
    expect(stats.expectedMinutes).toBe(stats.workedDays * 8 * 60);
    expect(stats.inconsistencies).toBe(1); // 22/10 missing exit (yesterday, complete minus exit)
    expect(stats.bankMinutes).toBeDefined();
    expect(stats.progressPercent).toBeGreaterThanOrEqual(0);
    expect(stats.progressPercent).toBeLessThanOrEqual(100);
  });
});

describe('Phase 4 admin data layer', () => {
  it('lists departments', async () => {
    const depts = await listDepartments('cmp-001');
    expect(depts.length).toBeGreaterThan(0);
    expect(depts.some((d) => d.name === 'Tecnologia')).toBe(true);
  });

  it('lists all geofences including inactive', async () => {
    const all = await listAllGeofences('cmp-001');
    expect(all.length).toBeGreaterThan(0);
  });

  it('inserts, updates, toggles and deletes a geofence', async () => {
    const id = await insertGeofence({
      companyId: 'cmp-001',
      name: 'Nova Unidade Teste',
      latitude: -23.5,
      longitude: -46.6,
      radiusMeters: 100,
      active: 1,
    });
    expect(id).toBeTruthy();

    await updateGeofence(id, { name: 'Unidade Renomeada', latitude: -23.51, longitude: -46.61, radiusMeters: 120, active: 1 });
    await toggleGeofence(id, 0);

    const all = await listAllGeofences('cmp-001');
    const created = all.find((g) => g.id === id);
    expect(created?.name).toBe('Unidade Renomeada');
    expect(created?.radius_meters).toBe(120);
    expect(created?.active).toBe(0);

    await deleteGeofence(id);
    const after = await listAllGeofences('cmp-001');
    expect(after.find((g) => g.id === id)).toBeUndefined();
  });

  it('businessDaysInMonth counts Mon-Fri only', () => {
    // October 2024: 23 business days
    expect(businessDaysInMonth(2024, 9)).toBe(23);
  });

  it('buildAdminReport aggregates bank hours, overtime and absences', async () => {
    const report = await getAdminReport('cmp-001', new Date().getFullYear(), new Date().getMonth());
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.rows[0]!.workedMinutes).toBeGreaterThanOrEqual(0);
    expect(report.departmentBreakdown.length).toBeGreaterThan(0);
    expect(report.weekly.length).toBe(4);
    expect(report.totalBankMinutes).toBeDefined();
    expect(report.absenceRate).toBeGreaterThanOrEqual(0);
  });
});