/**
 * Data access layer for employee mobile views (Phase 2).
 *
 * Talks to Turso through src/core/turso-client.ts when credentials are
 * configured (VITE_TURSO_URL + VITE_TURSO_TOKEN). When credentials are
 * absent (dev, tests, no .env) it degrades to a deterministic demo dataset
 * — so the app stays fully navigable and testable offline.
 */
import { CONFIG } from '../config.js';
import { tursoQuery, tursoExecute } from '../core/turso-client.js';
import type {
  AdjustmentRequest,
  CompanySettings,
  Geofence,
  MedicalCertificate,
  Punch,
  PunchSource,
  PunchType,
  User,
  WorkSchedule,
} from '../types.js';
import { computeWorkedMinutes, dateKey, nextPunchType } from '../utils/time.js';

export const HAS_TURSO = Boolean(CONFIG.TURSO_URL && CONFIG.TURSO_TOKEN);

/**
 * Runtime demo fallback — when Turso is configured but unreachable
 * (401/network/proxy), the app degrades to the demo dataset so it
 * remains navigable. Set by `useDemoFallback()`.
 */
let demoFallback = false;
export function setDemoFallback(v: boolean): void {
  demoFallback = v;
}
export const isDemoMode = (): boolean => !HAS_TURSO || demoFallback;

// ─── Local fallback seed (demo without Turso credentials) ───

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();

interface Seed {
  users: User[];
  schedules: Record<string, WorkSchedule>;
  punches: Punch[];
  certificates: MedicalCertificate[];
  adjustments: AdjustmentRequest[];
  geofences: Geofence[];
  settings: CompanySettings;
}

const demo = ((): Seed => {
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const users: User[] = [
    {
      id: 'usr-demo-1',
      company_id: 'cmp-001',
      department_id: 'dept-02',
      cpf: '35470291012',
      name: 'Ana Beatriz Souza',
      email: 'ana.souza@pponto.dev',
      role: 'employee',
      created_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'usr-demo-2',
      company_id: 'cmp-001',
      department_id: 'dept-02',
      cpf: '82947215075',
      name: 'Rafael Mendes',
      email: 'rafael.mendes@pponto.dev',
      role: 'employee',
      created_at: '2024-02-01T00:00:00Z',
    },
    {
      id: 'usr-demo-3',
      company_id: 'cmp-001',
      department_id: 'dept-03',
      cpf: '11122233344',
      name: 'Carlos Medeiros',
      email: 'carlos.medeiros@pponto.dev',
      role: 'manager',
      created_at: '2024-01-10T00:00:00Z',
    },
    {
      id: 'usr-demo-4',
      company_id: 'cmp-001',
      department_id: 'dept-01',
      cpf: '55566677788',
      name: 'Mariana Alencar',
      email: 'mariana.alencar@pponto.dev',
      role: 'rh',
      created_at: '2024-01-05T00:00:00Z',
    },
    {
      id: 'usr-demo-5',
      company_id: 'cmp-001',
      department_id: 'dept-01',
      cpf: '99988877766',
      name: 'Pedro Augusto',
      email: 'pedro.augusto@pponto.dev',
      role: 'admin',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const schedules: Record<string, WorkSchedule> = {
    'sch-comercial': {
      id: 'sch-comercial',
      company_id: 'cmp-001',
      name: 'Comercial 8h',
      description: '08:00 - 18:00 com 1h de almoço',
      created_at: '2024-01-01T00:00:00Z',
    },
    'sch-flex': {
      id: 'sch-flex',
      company_id: 'cmp-001',
      name: 'Home Office Flex',
      description: 'Jornada flexível 8h/dia',
      created_at: '2024-01-01T00:00:00Z',
    },
  };

  // ── Today: entry + break_start registered (break_end next) ──
  const mkPunch = (
    id: string,
    userId: string,
    dayOffset: number,
    type: PunchType,
    hh: number,
    mm: number,
    extras: Partial<Punch> = {},
  ): Punch => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hh, mm, 0, 0);
    return {
      id,
      user_id: userId,
      timestamp: d.toISOString(),
      type,
      photo_url: null,
      latitude: -23.5912,
      longitude: -46.683,
      gps_accuracy: 12,
      geofence_id: 'gf-001',
      source: 'mobile',
      offline_synced: 1,
      sync_queue_id: null,
      created_at: d.toISOString(),
      ...extras,
    };
  };

  const punches: Punch[] = [
    // Today
    mkPunch('pn-801', 'usr-demo-1', 0, 'entry', 8, 58, { geofence_id: 'gf-001' }),
    mkPunch('pn-802', 'usr-demo-1', 0, 'break_start', 12, 1, { geofence_id: 'gf-001' }),
    // Yesterday — full shift
    mkPunch('pn-701', 'usr-demo-1', -1, 'entry', 9, 0, { geofence_id: 'gf-001' }),
    mkPunch('pn-702', 'usr-demo-1', -1, 'break_start', 12, 0, { geofence_id: 'gf-001' }),
    mkPunch('pn-703', 'usr-demo-1', -1, 'break_end', 13, 0, { geofence_id: 'gf-001' }),
    mkPunch('pn-704', 'usr-demo-1', -1, 'exit', 18, 15, { geofence_id: 'gf-001' }),
    // 2 days ago — missing exit (inconsistency)
    mkPunch('pn-601', 'usr-demo-1', -2, 'entry', 9, 5, { geofence_id: 'gf-001' }),
    mkPunch('pn-602', 'usr-demo-1', -2, 'break_start', 12, 0, { geofence_id: 'gf-001' }),
    mkPunch('pn-603', 'usr-demo-1', -2, 'break_end', 13, 0, { geofence_id: 'gf-001' }),
    // 5 days ago — full shift with entry
    mkPunch('pn-501', 'usr-demo-1', -5, 'entry', 8, 45, { geofence_id: 'gf-001' }),
    mkPunch('pn-502', 'usr-demo-1', -5, 'break_start', 12, 5, { geofence_id: 'gf-001' }),
    mkPunch('pn-503', 'usr-demo-1', -5, 'break_end', 13, 3, { geofence_id: 'gf-001' }),
    mkPunch('pn-504', 'usr-demo-1', -5, 'exit', 18, 2, { geofence_id: 'gf-001' }),
  ];

  const certificates: MedicalCertificate[] = [
    {
      id: 'mc-001',
      user_id: 'usr-demo-1',
      uploaded_at: hoursAgo(120),
      photo_url: null,
      description: 'Declaração de Comparecimento Médico — consulta oftalmológica',
      start_date: dateKey(new Date(Date.now() - 5 * 86400000)),
      end_date: dateKey(new Date(Date.now() - 5 * 86400000)),
      status: 'approved',
      reviewed_by: 'usr-admin',
      reviewed_at: hoursAgo(118),
      created_at: hoursAgo(120),
    },
    {
      id: 'mc-002',
      user_id: 'usr-demo-1',
      uploaded_at: hoursAgo(30),
      photo_url: null,
      description: 'Atestado médico — repouso domiciliar (CID J06.9)',
      start_date: dateKey(new Date(Date.now() - 1 * 86400000)),
      end_date: dateKey(new Date()),
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      created_at: hoursAgo(30),
    },
  ];

  const adjustments: AdjustmentRequest[] = [
    {
      id: 'aj-001',
      user_id: 'usr-demo-1',
      created_at: hoursAgo(96),
      punch_date: dateKey(new Date(Date.now() - 2 * 86400000)),
      requested_entry: null,
      requested_exit: '18:00',
      reason: 'Esquecimento de registro ao sair para reunião externa com cliente.',
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
    },
    {
      id: 'aj-002',
      user_id: 'usr-demo-1',
      created_at: hoursAgo(200),
      punch_date: dateKey(new Date(Date.now() - 8 * 86400000)),
      requested_entry: null,
      requested_exit: '17:48',
      reason: 'Finalização de relatório de expedição com a gerência.',
      status: 'approved',
      reviewed_by: 'usr-mgr',
      reviewed_at: hoursAgo(190),
      review_notes: 'Aprovado — justificativa coerente com histórico.',
    },
  ];

  const geofences: Geofence[] = [
    {
      id: 'gf-001',
      company_id: 'cmp-001',
      name: 'Escritório Matriz',
      latitude: -23.5912,
      longitude: -46.683,
      radius_meters: 70,
      active: 1,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'gf-002',
      company_id: 'cmp-001',
      name: 'Unidade Santos',
      latitude: -23.9608,
      longitude: -46.3339,
      radius_meters: 120,
      active: 1,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const settings: CompanySettings = {
    company_id: 'cmp-001',
    geofencing_enabled: 1,
    photo_capture_enabled: 1,
    biometric_enabled: 1,
    offline_sync_enabled: 1,
    reminders_enabled: 1,
    reminder_lead_minutes: 15,
  };

  return { users, schedules, punches, certificates, adjustments, geofences, settings };
})();

// ─── Row → typed mappers ────────────────────────────────────

interface PunchRow {
  id: string;
  user_id: string;
  timestamp: string;
  type: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  geofence_id: string | null;
  source: string;
  offline_synced: number;
  sync_queue_id: string | null;
  created_at: string;
}

interface CertRow {
  id: string;
  user_id: string;
  uploaded_at: string;
  photo_url: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface AdjRow {
  id: string;
  user_id: string;
  created_at: string;
  punch_date: string;
  requested_entry: string | null;
  requested_exit: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

function toPunch(r: PunchRow): Punch {
  return {
    ...r,
    type: r.type as PunchType,
    source: r.source as PunchSource,
  };
}

function toCert(r: CertRow): MedicalCertificate {
  return { ...r, status: r.status as MedicalCertificate['status'] };
}

function toAdj(r: AdjRow): AdjustmentRequest {
  return { ...r, status: r.status as AdjustmentRequest['status'] };
}

// ─── Employee queries ───────────────────────────────────────

export interface UserWithSchedule extends User {
  scheduleName: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
}

/** All users (login dropdown) — demo-aware. */
export async function listUsers(): Promise<{ id: string; name: string; role: string }[]> {
  if (isDemoMode()) {
    return demo.users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }
  try {
    const rows = await tursoQuery<{ id: string; name: string; role: string }>(
      'SELECT id, name, role FROM users ORDER BY role, name',
    );
    setDemoFallback(false);
    return rows;
  } catch {
    // Turso unreachable/unauthorized → transparently degrade to demo
    setDemoFallback(true);
    return demo.users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }
}

/** Current user with their active work schedule (same company, dated). */
export async function getUserWithSchedule(userId: string): Promise<UserWithSchedule> {
  if (isDemoMode()) {
    const u = demo.users.find((x) => x.id === userId) ?? demo.users[0];
    const sch = demo.schedules['sch-comercial'];
    return { ...u, scheduleName: sch.name, scheduleStart: '08:00', scheduleEnd: '18:00' };
  }

  const rows = await tursoQuery<
    PunchRow & {
      u_name: string;
      u_cpf: string;
      u_email: string;
      u_role: string;
      u_company: string;
      u_dept: string | null;
      u_created: string;
      sch_name: string | null;
    }
  >(
    `SELECT p.*, u.name AS u_name, u.cpf AS u_cpf, u.email AS u_email,
            u.role AS u_role, u.company_id AS u_company, u.department_id AS u_dept,
            u.created_at AS u_created, ws.name AS sch_name
     FROM users u
     JOIN schedule_assignments sa ON sa.user_id = u.id
     JOIN work_schedules ws ON ws.id = sa.schedule_id
     LEFT JOIN punches p ON p.id IS NULL
     WHERE u.id = ?
     ORDER BY sa.start_date DESC LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  if (!r) throw new Error('Usuário não encontrado.');
  return {
    id: r.user_id,
    company_id: r.u_company,
    department_id: r.u_dept,
    cpf: r.u_cpf,
    name: r.u_name,
    email: r.u_email,
    role: r.u_role as User['role'],
    created_at: r.u_created,
    scheduleName: r.sch_name ?? 'Jornada CLT',
    scheduleStart: null,
    scheduleEnd: null,
  };
}

/** Punches for a user in a given YYYY-MM date window, oldest first. */
export async function getPunchesInRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Punch[]> {
  if (isDemoMode()) {
    return demo.punches
      .filter(
        (p) => p.user_id === userId && p.timestamp >= startIso && p.timestamp <= endIso,
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  const rows = await tursoQuery<PunchRow>(
    `SELECT * FROM punches
     WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp ASC`,
    [userId, startIso, endIso],
  );
  return rows.map(toPunch);
}

/** Today's punches for a user. */
export async function getTodayPunches(userId: string): Promise<Punch[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return getPunchesInRange(userId, start.toISOString(), end.toISOString());
}

/** Medical certificates for a user, newest first. */
export async function getCertificates(userId: string): Promise<MedicalCertificate[]> {
  if (isDemoMode()) {
    return demo.certificates
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }

  const rows = await tursoQuery<CertRow>(
    `SELECT * FROM medical_certificates
     WHERE user_id = ?
     ORDER BY uploaded_at DESC`,
    [userId],
  );
  return rows.map(toCert);
}

/** Adjustment requests for a user, newest first. */
export async function getAdjustments(userId: string): Promise<AdjustmentRequest[]> {
  if (isDemoMode()) {
    return demo.adjustments
      .filter((a) => a.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const rows = await tursoQuery<AdjRow>(
    `SELECT * FROM adjustment_requests
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(toAdj);
}

/** Active geofences for the user's company. */
export async function getGeofences(companyId: string): Promise<Geofence[]> {
  if (isDemoMode()) {
    return demo.geofences.filter((g) => g.company_id === companyId && g.active === 1);
  }
  const rows = await tursoQuery<Geofence>(
    `SELECT * FROM geofences WHERE company_id = ? AND active = 1`,
    [companyId],
  );
  return rows;
}

/** Company settings feature flags. */
export async function getCompanySettings(companyId: string): Promise<CompanySettings> {
  if (isDemoMode()) {
    return demo.settings;
  }
  const rows = await tursoQuery<CompanySettings>(
    `SELECT * FROM company_settings WHERE company_id = ? LIMIT 1`,
    [companyId],
  );
  return rows[0] ?? demo.settings;
}

// ─── Writes ─────────────────────────────────────────────────

/** Register a punch (online path). Uses tursoExecute or persists locally on demo. */
export async function insertPunch(input: {
  userId: string;
  type: PunchType;
  timestamp: string;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  geofenceId: string | null;
  source: PunchSource;
}): Promise<string> {
  const id = `pn-${crypto.randomUUID().slice(0, 8)}`;

  if (isDemoMode()) {
    demo.punches.push({
      id,
      user_id: input.userId,
      timestamp: input.timestamp,
      type: input.type,
      photo_url: input.photoUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      gps_accuracy: input.gpsAccuracy,
      geofence_id: input.geofenceId,
      source: input.source,
      offline_synced: 1,
      sync_queue_id: null,
      created_at: new Date().toISOString(),
    });
    return id;
  }

  await tursoExecute(
    `INSERT INTO punches
       (id, user_id, timestamp, type, photo_url, latitude, longitude,
        gps_accuracy, geofence_id, source, offline_synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      input.userId,
      input.timestamp,
      input.type,
      input.photoUrl,
      input.latitude,
      input.longitude,
      input.gpsAccuracy,
      input.geofenceId,
      input.source,
      new Date().toISOString(),
    ],
  );
  return id;
}

/** Create an adjustment request. */
export async function insertAdjustment(input: {
  userId: string;
  punchDate: string;
  requestedEntry: string | null;
  requestedExit: string | null;
  reason: string;
}): Promise<void> {
  const id = `aj-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  if (isDemoMode()) {
    demo.adjustments.unshift({
      id,
      user_id: input.userId,
      created_at: now,
      punch_date: input.punchDate,
      requested_entry: input.requestedEntry,
      requested_exit: input.requestedExit,
      reason: input.reason,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
    });
    return;
  }

  await tursoExecute(
    `INSERT INTO adjustment_requests
       (id, user_id, created_at, punch_date, requested_entry, requested_exit,
        reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      input.userId,
      now,
      input.punchDate,
      input.requestedEntry,
      input.requestedExit,
      input.reason,
    ],
  );
}

/** Create a medical certificate submission. */
export async function insertCertificate(input: {
  userId: string;
  description: string | null;
  startDate: string;
  endDate: string;
  photoUrl: string | null;
}): Promise<void> {
  const id = `mc-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  if (isDemoMode()) {
    demo.certificates.unshift({
      id,
      user_id: input.userId,
      uploaded_at: now,
      photo_url: input.photoUrl,
      description: input.description,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
    });
    return;
  }

  await tursoExecute(
    `INSERT INTO medical_certificates
       (id, user_id, uploaded_at, photo_url, description, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, input.userId, now, input.photoUrl, input.description, input.startDate, input.endDate],
  );
}

// ─── Derived aggregation helpers ────────────────────────────

export interface MonthStats {
  workedMinutes: number;
  expectedMinutes: number;
  workedDays: number;
  inconsistencies: number;
  certificateDays: number;
  bankMinutes: number;
  progressPercent: number;
}

export const EXPECTED_DAILY_MINUTES = 8 * 60;

/** Aggregate a month of punches into espelho summary stats. */
export function summarizeMonth(
  punches: Punch[],
  certificates: MedicalCertificate[],
  expectedDailyMinutes = EXPECTED_DAILY_MINUTES,
): MonthStats {
  const byDay = new Map<string, Record<PunchType, string | null>>();
  const inconsistencyDays = new Set<string>();
  const todayKey = dateKey(new Date());

  for (const p of punches) {
    const key = dateKey(new Date(p.timestamp));
    if (!byDay.has(key)) {
      byDay.set(key, { entry: null, break_start: null, break_end: null, exit: null });
    }
    const day = byDay.get(key)!;
    day[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
  }

  let workedMinutes = 0;
  let workedDays = 0;
  for (const [key, slots] of byDay) {
    const total = computeWorkedMinutes(slots);
    workedMinutes += total;
    workedDays += 1;
    // Inconsistency = day started but exit never registered (and not today).
    const missingExit = slots.entry !== null && slots.exit === null;
    if (key !== todayKey && missingExit) {
      inconsistencyDays.add(key);
    }
  }

  const certificateDays = new Set(
    certificates
      .filter((c) => c.status === 'approved' || c.status === 'pending')
      .map((c) => c.start_date),
  ).size;

  const expected = workedDays * expectedDailyMinutes;
  const bank = workedMinutes - expected;
  const progressPercent =
    expected > 0 ? Math.min(100, Math.round((workedMinutes / expected) * 100)) : 0;

  return {
    workedMinutes,
    expectedMinutes: expected,
    workedDays,
    inconsistencies: inconsistencyDays.size,
    certificateDays,
    bankMinutes: bank,
    progressPercent,
  };
}

/** Group punches into per-day slots for the espelho list. */
export function groupPunchesByDay(
  punches: Punch[],
): Map<string, Record<PunchType, string | null>> {
  const byDay = new Map<string, Record<PunchType, string | null>>();
  for (const p of punches) {
    const key = dateKey(new Date(p.timestamp));
    if (!byDay.has(key)) {
      byDay.set(key, { entry: null, break_start: null, break_end: null, exit: null });
    }
    const day = byDay.get(key)!;
    day[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
  }
  return byDay;
}

/** Next expected punch for today — derived from current punches. */
export async function nextPunchForToday(
  userId: string,
): Promise<{ next: PunchType | null; today: Punch[] }> {
  const today = await getTodayPunches(userId);
  const types = today.map((p) => p.type);
  return { next: nextPunchType(types), today };
}