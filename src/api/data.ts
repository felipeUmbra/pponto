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
  Department,
  Geofence,
  MedicalCertificate,
  Punch,
  PunchSource,
  PunchType,
  User,
  WorkSchedule,
} from '../types.js';
import { computeWorkedMinutes, dateKey, nextPunchType, parseDateKey, parseHHmm } from '../utils/time.js';

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

/**
 * Run the Turso query and, on ANY failure (401/network/proxy), flip the
 * demo fallback flag and return the demo equivalent. Mirrors `listUsers()`
 * so a restored session (no login round-trip) still gets demo data when
 * Turso is unreachable or the token is invalid.
 */
async function withDemo<T>(tursoFn: () => Promise<T>, demoFn: () => Promise<T> | T): Promise<T> {
  if (isDemoMode()) return demoFn();
  try {
    const result = await tursoFn();
    setDemoFallback(false);
    return result;
  } catch {
    setDemoFallback(true);
    return demoFn();
  }
}

// ─── Local fallback seed (demo without Turso credentials) ───

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();

interface Seed {
  users: User[];
  schedules: Record<string, WorkSchedule>;
  departments: Department[];
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

  const departments: Department[] = [
    { id: 'dept-01', company_id: 'cmp-001', name: 'Recursos Humanos', created_at: '2024-01-01T00:00:00Z' },
    { id: 'dept-02', company_id: 'cmp-001', name: 'Tecnologia', created_at: '2024-01-01T00:00:00Z' },
    { id: 'dept-03', company_id: 'cmp-001', name: 'Comercial', created_at: '2024-01-01T00:00:00Z' },
    { id: 'dept-04', company_id: 'cmp-001', name: 'Operações', created_at: '2024-01-01T00:00:00Z' },
  ];

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

  return { users, schedules, departments, punches, certificates, adjustments, geofences, settings };
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
  const demoUser = (): UserWithSchedule => {
    const u = demo.users.find((x) => x.id === userId) ?? demo.users[0];
    const sch = demo.schedules['sch-comercial'];
    return { ...u, scheduleName: sch.name, scheduleStart: '08:00', scheduleEnd: '18:00' };
  };

  return withDemo(
    async () => {
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
    },
    demoUser,
  );
}

/** Punches for a user in a given YYYY-MM date window, oldest first. */
export async function getPunchesInRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Punch[]> {
  return withDemo(
    async () => {
      const rows = await tursoQuery<PunchRow>(
        `SELECT * FROM punches
         WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp ASC`,
        [userId, startIso, endIso],
      );
      return rows.map(toPunch);
    },
    () =>
      demo.punches
        .filter(
          (p) => p.user_id === userId && p.timestamp >= startIso && p.timestamp <= endIso,
        )
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  );
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
  return withDemo(
    async () => {
      const rows = await tursoQuery<CertRow>(
        `SELECT * FROM medical_certificates
         WHERE user_id = ?
         ORDER BY uploaded_at DESC`,
        [userId],
      );
      return rows.map(toCert);
    },
    () =>
      demo.certificates
        .filter((c) => c.user_id === userId)
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)),
  );
}

/** Adjustment requests for a user, newest first. */
export async function getAdjustments(userId: string): Promise<AdjustmentRequest[]> {
  return withDemo(
    async () => {
      const rows = await tursoQuery<AdjRow>(
        `SELECT * FROM adjustment_requests
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId],
      );
      return rows.map(toAdj);
    },
    () =>
      demo.adjustments
        .filter((a) => a.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
}

/** Active geofences for the user's company. */
export async function getGeofences(companyId: string): Promise<Geofence[]> {
  return withDemo(
    () =>
      tursoQuery<Geofence>(`SELECT * FROM geofences WHERE company_id = ? AND active = 1`, [
        companyId,
      ]),
    () => demo.geofences.filter((g) => g.company_id === companyId && g.active === 1),
  );
}

/** Company settings feature flags. */
export async function getCompanySettings(companyId: string): Promise<CompanySettings> {
  return withDemo(
    async () => {
      const rows = await tursoQuery<CompanySettings>(
        `SELECT * FROM company_settings WHERE company_id = ? LIMIT 1`,
        [companyId],
      );
      return rows[0] ?? demo.settings;
    },
    () => demo.settings,
  );
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

// ─── Admin queries (Phase 3) ────────────────────────────────

export interface AdminUserRow {
  user: User;
  scheduleName: string;
  todayPunches: Punch[];
  lastPunchType: PunchType | null;
  inconsistency: 'missing_exit' | 'missing_entry' | 'none';
  workedMinutesToday: number;
}

/** All users with today's punch data for the tratamento table. */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const buildRows = (): AdminUserRow[] => {
    const rows: AdminUserRow[] = [];
    for (const u of demo.users) {
      const todayPunches = demo.punches
        .filter((p) => p.user_id === u.id && dateKey(new Date(p.timestamp)) === dateKey(new Date()))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const lastType = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1].type : null;
      const slots: Record<PunchType, string | null> = { entry: null, break_start: null, break_end: null, exit: null };
      for (const p of todayPunches) {
        slots[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
      }
      const workedMin = computeWorkedMinutes(slots);
      let inconsistency: AdminUserRow['inconsistency'] = 'none';
      if (todayPunches.length === 0) {
        inconsistency = 'missing_entry';
      } else if (lastType !== 'exit' && slots.entry !== null) {
        inconsistency = 'missing_exit';
      }
      rows.push({
        user: u,
        scheduleName: demo.schedules['sch-comercial'].name,
        todayPunches,
        lastPunchType: lastType,
        inconsistency,
        workedMinutesToday: workedMin,
      });
    }
    return rows;
  };

  return withDemo(
    async () => {
      const userRows = await tursoQuery<User & { sch_name: string | null }>(
        `SELECT u.*, ws.name AS sch_name
         FROM users u
         LEFT JOIN schedule_assignments sa ON sa.user_id = u.id
         LEFT JOIN work_schedules ws ON ws.id = sa.schedule_id
         ORDER BY u.name`,
      );

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const punchRows = await tursoQuery<PunchRow>(
        `SELECT * FROM punches WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC`,
        [todayStart.toISOString(), todayEnd.toISOString()],
      );

      const punchesByUser = new Map<string, Punch[]>();
      for (const pr of punchRows) {
        const list = punchesByUser.get(pr.user_id) ?? [];
        list.push(toPunch(pr));
        punchesByUser.set(pr.user_id, list);
      }

      return userRows.map((u) => {
        const todayPunches = punchesByUser.get(u.id) ?? [];
        const lastType = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1].type : null;
        const slots: Record<PunchType, string | null> = { entry: null, break_start: null, break_end: null, exit: null };
        for (const p of todayPunches) {
          slots[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
        }
        let inconsistency: AdminUserRow['inconsistency'] = 'none';
        if (todayPunches.length === 0) {
          inconsistency = 'missing_entry';
        } else if (lastType !== 'exit' && slots.entry !== null) {
          inconsistency = 'missing_exit';
        }
        return {
          user: u,
          scheduleName: u.sch_name ?? 'CLT',
          todayPunches,
          lastPunchType: lastType,
          inconsistency,
          workedMinutesToday: computeWorkedMinutes(slots),
        };
      });
    },
    buildRows,
  );
}

/** Dashboard KPI stats — present today, pending adjustments, pending certificates. */
export async function getAdminStats(): Promise<{
  presentToday: number;
  totalUsers: number;
  pendingAdjustments: number;
  pendingCertificates: number;
  pendingCount: number;
  inconsistencies: number;
}> {
  const demoStats = (): {
    presentToday: number;
    totalUsers: number;
    pendingAdjustments: number;
    pendingCertificates: number;
    pendingCount: number;
    inconsistencies: number;
  } => {
    const todayKeyStr = dateKey(new Date());
    const presentToday = new Set(
      demo.punches
        .filter((p) => dateKey(new Date(p.timestamp)) === todayKeyStr && p.type === 'entry')
        .map((p) => p.user_id),
    ).size;
    const pendingAdj = demo.adjustments.filter((a) => a.status === 'pending').length;
    const pendingCert = demo.certificates.filter((c) => c.status === 'pending').length;
    // count days with missing exit (not today)
    const inconsistencyCount = new Set(
      demo.users
        .filter((u) => {
          const lastPunch = demo.punches
            .filter((p) => p.user_id === u.id)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
          if (!lastPunch) return false;
          const pk = dateKey(new Date(lastPunch.timestamp));
          return pk !== todayKeyStr && lastPunch.type !== 'exit';
        })
        .map((u) => u.id),
    ).size;
    return {
      presentToday,
      totalUsers: demo.users.length,
      pendingAdjustments: pendingAdj,
      pendingCertificates: pendingCert,
      pendingCount: pendingAdj + pendingCert,
      inconsistencies: inconsistencyCount,
    };
  };

  return withDemo(
    async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [totalRows, presentRows, pendingAdjRows, pendingCertRows] = await Promise.all([
        tursoQuery<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM users'),
        tursoQuery<{ cnt: number }>(
          'SELECT COUNT(DISTINCT user_id) AS cnt FROM punches WHERE timestamp >= ? AND timestamp <= ?',
          [todayStart.toISOString(), todayEnd.toISOString()],
        ),
        tursoQuery<{ cnt: number }>(
          "SELECT COUNT(*) AS cnt FROM adjustment_requests WHERE status = 'pending'",
        ),
        tursoQuery<{ cnt: number }>(
          "SELECT COUNT(*) AS cnt FROM medical_certificates WHERE status = 'pending'",
        ),
      ]);

      return {
        presentToday: presentRows[0]?.cnt ?? 0,
        totalUsers: totalRows[0]?.cnt ?? 0,
        pendingAdjustments: pendingAdjRows[0]?.cnt ?? 0,
        pendingCertificates: pendingCertRows[0]?.cnt ?? 0,
        pendingCount: (pendingAdjRows[0]?.cnt ?? 0) + (pendingCertRows[0]?.cnt ?? 0),
        inconsistencies: 0,
      };
    },
    demoStats,
  );
}

/** All pending certificates (admin view). */
export async function listPendingCertificates(): Promise<MedicalCertificate[]> {
  return withDemo(
    () =>
      tursoQuery<CertRow>(
        `SELECT * FROM medical_certificates WHERE status = 'pending' ORDER BY uploaded_at ASC`,
      ).then((rows) => rows.map(toCert)),
    () =>
      demo.certificates
        .filter((c) => c.status === 'pending')
        .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)),
  );
}

/** All pending adjustments (admin view). */
export async function listPendingAdjustments(): Promise<AdjustmentRequest[]> {
  return withDemo(
    () =>
      tursoQuery<AdjRow>(
        `SELECT * FROM adjustment_requests WHERE status = 'pending' ORDER BY created_at ASC`,
      ).then((rows) => rows.map(toAdj)),
    () =>
      demo.adjustments
        .filter((a) => a.status === 'pending')
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  );
}

/** Approve or reject a medical certificate. */
export async function reviewCertificate(
  certId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (isDemoMode()) {
    const cert = demo.certificates.find((c) => c.id === certId);
    if (cert) {
      cert.status = status;
      cert.reviewed_by = reviewerId;
      cert.reviewed_at = now;
    }
    return;
  }
  await tursoExecute(
    `UPDATE medical_certificates SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
    [status, reviewerId, now, certId],
  );
}

/** Approve or reject an adjustment request. */
export async function reviewAdjustment(
  adjId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  notes: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  if (isDemoMode()) {
    const adj = demo.adjustments.find((a) => a.id === adjId);
    if (adj) {
      adj.status = status;
      adj.reviewed_by = reviewerId;
      adj.reviewed_at = now;
      adj.review_notes = notes;
    }
    return;
  }
  await tursoExecute(
    `UPDATE adjustment_requests SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE id = ?`,
    [status, reviewerId, now, notes, adjId],
  );
}

// ─── Admin queries (Phase 4) ───────────────────────────────

/** All departments for a company (filter dropdown + RBAC). */
export async function listDepartments(companyId: string): Promise<Department[]> {
  return withDemo(
    () =>
      tursoQuery<Department>(
        'SELECT * FROM departments WHERE company_id = ? ORDER BY name',
        [companyId],
      ),
    () => demo.departments.filter((d) => d.company_id === companyId),
  );
}

/** All geofences (active + inactive) for the cercas configuration view. */
export async function listAllGeofences(companyId: string): Promise<Geofence[]> {
  return withDemo(
    () =>
      tursoQuery<Geofence>(
        'SELECT * FROM geofences WHERE company_id = ? ORDER BY created_at ASC',
        [companyId],
      ),
    () => demo.geofences.filter((g) => g.company_id === companyId),
  );
}

/** Create a new geofence. */
export async function insertGeofence(input: {
  companyId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: number;
}): Promise<string> {
  const id = `gf-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  if (isDemoMode()) {
    demo.geofences.push({
      id,
      company_id: input.companyId,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters,
      active: input.active,
      created_at: now,
    });
    return id;
  }
  await tursoExecute(
    `INSERT INTO geofences (id, company_id, name, latitude, longitude, radius_meters, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.companyId,
      input.name,
      input.latitude,
      input.longitude,
      input.radiusMeters,
      input.active,
      now,
    ],
  );
  return id;
}

/** Update an existing geofence's parameters. */
export async function updateGeofence(
  fenceId: string,
  input: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    active: number;
  },
): Promise<void> {
  if (isDemoMode()) {
    const g = demo.geofences.find((x) => x.id === fenceId);
    if (g) {
      g.name = input.name;
      g.latitude = input.latitude;
      g.longitude = input.longitude;
      g.radius_meters = input.radiusMeters;
      g.active = input.active;
    }
    return;
  }
  await tursoExecute(
    `UPDATE geofences SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, active = ? WHERE id = ?`,
    [input.name, input.latitude, input.longitude, input.radiusMeters, input.active, fenceId],
  );
}

/** Toggle a geofence active/inactive. */
export async function toggleGeofence(fenceId: string, active: number): Promise<void> {
  if (isDemoMode()) {
    const g = demo.geofences.find((x) => x.id === fenceId);
    if (g) g.active = active;
    return;
  }
  await tursoExecute('UPDATE geofences SET active = ? WHERE id = ?', [active, fenceId]);
}

/** Delete a geofence. */
export async function deleteGeofence(fenceId: string): Promise<void> {
  if (isDemoMode()) {
    const idx = demo.geofences.findIndex((x) => x.id === fenceId);
    if (idx >= 0) demo.geofences.splice(idx, 1);
    return;
  }
  await tursoExecute('DELETE FROM geofences WHERE id = ?', [fenceId]);
}

/** Persist company settings feature flags. */
export async function updateCompanySettings(
  companyId: string,
  patch: Partial<Omit<CompanySettings, 'company_id'>>,
): Promise<void> {
  if (isDemoMode()) {
    Object.assign(demo.settings, patch, { company_id: companyId });
    return;
  }
  const current = await getCompanySettings(companyId);
  const merged = { ...current, ...patch };
  await tursoExecute(
    `UPDATE company_settings SET geofencing_enabled = ?, photo_capture_enabled = ?,
       biometric_enabled = ?, offline_sync_enabled = ?, reminders_enabled = ?,
       reminder_lead_minutes = ?
     WHERE company_id = ?`,
    [
      merged.geofencing_enabled,
      merged.photo_capture_enabled,
      merged.biometric_enabled,
      merged.offline_sync_enabled,
      merged.reminders_enabled,
      merged.reminder_lead_minutes,
      companyId,
    ],
  );
}

// ─── Analytics & bank hours (Relatórios #17) ───────────────

export interface BankReportRow {
  user: User;
  departmentName: string;
  scheduleName: string;
  workedMinutes: number;
  overtime50: number;
  overtime100: number;
  absences: number;
  lateMinutes: number;
  monthBalance: number;
  accumulatedBalance: number;
  expiryDays: number | null;
}

export interface AdminReportData {
  rows: BankReportRow[];
  totalBankMinutes: number;
  totalOvertimeMinutes: number;
  overtime50: number;
  overtime100: number;
  absenceRate: number;
  expiringCount: number;
  departmentBreakdown: { name: string; overtimeMinutes: number; percent: number }[];
  weekly: { label: string; expectedMinutes: number; workedMinutes: number }[];
}

/** Business days (Mon-Fri) between two dates, inclusive. */
export function businessDaysInMonth(year: number, month0: number): number {
  const days = new Date(year, month0 + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d += 1) {
    const wd = new Date(year, month0, d).getDay();
    if (wd !== 0 && wd !== 6) count += 1;
  }
  return count;
}

/** Overtime split per CLT: up to 2h/day extra at 50%, remainder at 100%. */
function splitOvertime(extraMinutes: number): { ot50: number; ot100: number } {
  const ot50 = Math.min(120, extraMinutes);
  const ot100 = Math.max(0, extraMinutes - 120);
  return { ot50, ot100 };
}

/**
 * Pure aggregation: build the bank-hours / analytics report from raw rows.
 * Works with both Turso rows (after mapping) and the demo dataset.
 */
export function buildAdminReport(
  users: Array<
    User & { scheduleName?: string | null; departmentName?: string | null }
  >,
  punches: Punch[],
  certificates: MedicalCertificate[],
  year: number,
  month0: number,
): AdminReportData {
  const monthStart = new Date(year, month0, 1);
  const monthEnd = new Date(year, month0 + 1, 0, 23, 59, 59, 999);
  const rangeStart = monthStart.toISOString();
  const rangeEnd = monthEnd.toISOString();
  const startKey = dateKey(monthStart);
  const endKey = dateKey(monthEnd);
  const expectedDaily = EXPECTED_DAILY_MINUTES;

  const punchesByUser = new Map<string, Punch[]>();
  for (const p of punches) {
    if (p.timestamp < rangeStart || p.timestamp > rangeEnd) continue;
    const list = punchesByUser.get(p.user_id) ?? [];
    list.push(p);
    punchesByUser.set(p.user_id, list);
  }

  const certByUser = new Map<string, MedicalCertificate[]>();
  for (const c of certificates) {
    if (c.status !== 'approved') continue;
    if (c.start_date > endKey || c.end_date < startKey) continue;
    const list = certByUser.get(c.user_id) ?? [];
    list.push(c);
    certByUser.set(c.user_id, list);
  }

  const rows: BankReportRow[] = [];
  let totalBank = 0;
  let totalOvertime = 0;
  let totalOvertime50 = 0;
  let totalOvertime100 = 0;
  let totalAbsences = 0;
  let expiringCount = 0;
  const deptOvertime = new Map<string, number>();

  for (const u of users) {
    const userPunches = punchesByUser.get(u.id) ?? [];
    const certs = certByUser.get(u.id) ?? [];

    // Group by day
    const byDay = new Map<string, Record<PunchType, string | null>>();
    for (const p of userPunches) {
      const key = dateKey(new Date(p.timestamp));
      if (!byDay.has(key)) {
        byDay.set(key, { entry: null, break_start: null, break_end: null, exit: null });
      }
      const day = byDay.get(key)!;
      day[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
    }

    let workedMinutes = 0;
    let lateMinutes = 0;
    let rowOvertime50 = 0;
    let rowOvertime100 = 0;
    const workedDayKeys = new Set<string>();

    for (const [key, slots] of byDay) {
      const worked = computeWorkedMinutes(slots);
      workedMinutes += worked;
      workedDayKeys.add(key);
      if (slots.entry) {
        const entryMin = parseHHmm(slots.entry);
        if (!Number.isNaN(entryMin) && entryMin > 8 * 60) {
          lateMinutes += entryMin - 8 * 60;
        }
      }
      const extra = Math.max(0, worked - expectedDaily);
      const { ot50, ot100 } = splitOvertime(extra);
      rowOvertime50 += ot50;
      rowOvertime100 += ot100;
    }
    totalOvertime50 += rowOvertime50;
    totalOvertime100 += rowOvertime100;
    totalOvertime += rowOvertime50 + rowOvertime100;

    // Certificate days within month (approved) — justified absences
    const certDays = new Set<string>();
    for (const c of certs) {
      const s = parseDateKey(c.start_date);
      const e = parseDateKey(c.end_date);
      const cur = new Date(s);
      while (cur <= e) {
        const key = dateKey(cur);
        if (key >= startKey && key <= endKey) certDays.add(key);
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Absences = weekdays with neither punch nor approved cert (until today)
    let absences = 0;
    const todayKey = dateKey(new Date());
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dt = new Date(year, month0, d);
      const wd = dt.getDay();
      if (wd === 0 || wd === 6) continue;
      const key = dateKey(dt);
      if (key > todayKey) break; // don't count future days
      if (!workedDayKeys.has(key) && !certDays.has(key)) absences += 1;
    }
    totalAbsences += absences;

    const monthBalance = workedMinutes - workedDayKeys.size * expectedDaily;
    const accumulatedBalance = monthBalance;
    totalBank += accumulatedBalance;

    // Expiry: positive balances expire 180 days after month start (CLT Art. 59 §5º)
    let expiryDays: number | null = null;
    if (accumulatedBalance > 0) {
      expiryDays = Math.max(0, 180 - (new Date().getDate() - 1));
      if (expiryDays <= 30) expiringCount += 1;
    }

    const deptName = u.departmentName ?? 'Sem setor';
    const currentDept = deptOvertime.get(deptName) ?? 0;
    deptOvertime.set(deptName, currentDept + rowOvertime50 + rowOvertime100);

    rows.push({
      user: u,
      departmentName: deptName,
      scheduleName: u.scheduleName ?? 'CLT',
      workedMinutes,
      overtime50: rowOvertime50,
      overtime100: rowOvertime100,
      absences,
      lateMinutes,
      monthBalance,
      accumulatedBalance,
      expiryDays,
    });
  }

  const departmentBreakdown = [...deptOvertime.entries()]
    .map(([name, overtimeMinutes]) => ({
      name,
      overtimeMinutes,
      percent: totalOvertime > 0 ? Math.round((overtimeMinutes / totalOvertime) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.overtimeMinutes - a.overtimeMinutes);

  // Weekly planned vs effective (4 buckets) — aggregate across all users
  const weekly: { label: string; expectedMinutes: number; workedMinutes: number }[] = [];
  const daysInMonth2 = new Date(year, month0 + 1, 0).getDate();
  const totalExpectedWeekly = businessDaysInMonth(year, month0) * expectedDaily;
  for (let w = 0; w < 4; w += 1) {
    const weekStartDay = 1 + w * 7;
    const weekEndDay = Math.min(7 + w * 7, daysInMonth2);
    const weekStart = new Date(year, month0, weekStartDay);
    const weekEnd = new Date(year, month0, weekEndDay, 23, 59, 59, 999);

    let weekWorkedMinutes = 0;
    for (const up of punchesByUser.values()) {
      const byDayW = new Map<string, Record<PunchType, string | null>>();
      for (const p of up) {
        const t = new Date(p.timestamp);
        if (t >= weekStart && t <= weekEnd) {
          const key = dateKey(t);
          if (!byDayW.has(key)) {
            byDayW.set(key, { entry: null, break_start: null, break_end: null, exit: null });
          }
          const day = byDayW.get(key)!;
          day[p.type] = new Date(p.timestamp).toTimeString().slice(0, 5);
        }
      }
      for (const slots of byDayW.values()) weekWorkedMinutes += computeWorkedMinutes(slots);
    }

    // Expected minutes proportional to weekdays in this week × all users
    let weekdays = 0;
    for (let d = weekStartDay; d <= weekEndDay; d += 1) {
      const wd = new Date(year, month0, d).getDay();
      if (wd !== 0 && wd !== 6) weekdays += 1;
    }
    weekly.push({
      label: `Semana ${w + 1} (${String(weekStartDay).padStart(2, '0')}-${String(weekEndDay).padStart(2, '0')})`,
      expectedMinutes: weekdays * expectedDaily * users.length,
      workedMinutes: weekWorkedMinutes,
    });
  }

  void totalExpectedWeekly;

  return {
    rows,
    totalBankMinutes: totalBank,
    totalOvertimeMinutes: totalOvertime,
    overtime50: totalOvertime50,
    overtime100: totalOvertime100,
    absenceRate: users.length > 0 ? (totalAbsences / users.length) * 100 : 0,
    expiringCount,
    departmentBreakdown,
    weekly,
  };
}

/** Fetch the full admin analytics report (demo-aware). */
export async function getAdminReport(
  companyId: string,
  year: number,
  month0: number,
): Promise<AdminReportData> {
  const demoReport = (): AdminReportData => {
    const users = demo.users.map((u) => ({
      ...u,
      scheduleName: demo.schedules['sch-comercial']?.name,
      departmentName: demo.departments.find((d) => d.id === u.department_id)?.name ?? null,
    }));
    return buildAdminReport(users, demo.punches, demo.certificates, year, month0);
  };

  return withDemo(
    async () => {
      const [userRows, punchRows, certRows] = await Promise.all([
        tursoQuery<User & { sch_name: string | null; dept_name: string | null }>(
          `SELECT u.*, ws.name AS sch_name, d.name AS dept_name
           FROM users u
           LEFT JOIN schedule_assignments sa ON sa.user_id = u.id
           LEFT JOIN work_schedules ws ON ws.id = sa.schedule_id
           LEFT JOIN departments d ON d.id = u.department_id
           WHERE u.company_id = ?
           ORDER BY u.name`,
          [companyId],
        ),
        tursoQuery<PunchRow>(
          `SELECT * FROM punches
           WHERE timestamp >= ? AND timestamp < ?
           ORDER BY timestamp ASC`,
          [
            new Date(year, month0, 1).toISOString(),
            new Date(year, month0 + 1, 1).toISOString(),
          ],
        ),
        tursoQuery<CertRow>(
          `SELECT * FROM medical_certificates
           WHERE status = 'approved'
           ORDER BY start_date ASC`,
        ),
      ]);

      const users = userRows.map((r) => ({
        ...r,
        scheduleName: r.sch_name,
        departmentName: r.dept_name,
      }));
      return buildAdminReport(users, punchRows.map(toPunch), certRows.map(toCert), year, month0);
    },
    demoReport,
  );
}