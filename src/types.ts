/**
 * Shared TypeScript interfaces for the pPonto PWA.
 * Derived from the BRD and Turso database schema.
 */

// ─── Auth & Users ───────────────────────────────────────────
export type UserRole = 'employee' | 'manager' | 'admin' | 'rh';

export interface User {
  id: string;
  company_id: string;
  department_id: string | null;
  cpf: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Session {
  user: User;
  token: string;
  login_at: string;
}

// ─── Company & Departments ──────────────────────────────────
export interface Company {
  id: string;
  cnpj: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

// ─── Schedules ──────────────────────────────────────────────
export interface WorkSchedule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ScheduleAssignment {
  id: string;
  user_id: string;
  schedule_id: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

// ─── Punches ────────────────────────────────────────────────
export type PunchType = 'entry' | 'exit' | 'break_start' | 'break_end';
export type PunchSource = 'web' | 'mobile' | 'rep' | 'manual';

export interface Punch {
  id: string;
  user_id: string;
  timestamp: string;
  type: PunchType;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  geofence_id: string | null;
  source: PunchSource;
  offline_synced: number;
  sync_queue_id: string | null;
  created_at: string;
}

// ─── Geofences ──────────────────────────────────────────────
export interface Geofence {
  id: string;
  company_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: number;
  created_at: string;
}

// ─── Medical Certificates (Atestados) ───────────────────────
export type CertificateStatus = 'pending' | 'approved' | 'rejected';

export interface MedicalCertificate {
  id: string;
  user_id: string;
  uploaded_at: string;
  photo_url: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  status: CertificateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Adjustment Requests ────────────────────────────────────
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

export interface AdjustmentRequest {
  id: string;
  user_id: string;
  created_at: string;
  punch_date: string;
  requested_entry: string | null;
  requested_exit: string | null;
  reason: string;
  status: AdjustmentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

// ─── Company Settings ───────────────────────────────────────
export interface CompanySettings {
  company_id: string;
  geofencing_enabled: number;
  photo_capture_enabled: number;
  biometric_enabled: number;
  offline_sync_enabled: number;
  reminders_enabled: number;
  reminder_lead_minutes: number;
}

// ─── Offline Sync Queue ─────────────────────────────────────
export interface OfflineSyncItem {
  id: string;
  user_id: string;
  punch_data: string;
  created_at: string;
  synced_at: string | null;
}

// ─── Router Types ───────────────────────────────────────────
export type RouteName =
  | 'login'
  | 'ponto'
  | 'espelho'
  | 'solicitacoes'
  | 'ajuste'
  | 'admin'
  | 'admin-ponto-web'
  | 'admin-tratamento'
  | 'admin-homologacao'
  | 'admin-aprovacao'
  | 'admin-relatorios'
  | 'admin-fechamento'
  | 'admin-cercas'
  | 'admin-offline'
  | 'admin-configuracoes'
  | 'not-found';

export interface Route {
  name: RouteName;
  path: string;
  /** Roles allowed to access; empty = public */
  roles: UserRole[];
  /** 'mobile' or 'admin' layout */
  layout: 'mobile' | 'admin' | 'none';
}

export interface MatchedRoute {
  route: Route;
  params: Record<string, string>;
}
