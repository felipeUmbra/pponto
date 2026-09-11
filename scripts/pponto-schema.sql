TABLES: adjustment_requests, companies, company_settings, departments, geofences, medical_certificates, offline_sync_queue, punches, schedule_assignments, users, work_schedules

-- adjustment_requests --
CREATE TABLE adjustment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  punch_date TEXT NOT NULL,
  requested_entry TEXT,
  requested_exit TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  review_notes TEXT
);

-- companies --
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- company_settings --
CREATE TABLE company_settings (
  company_id TEXT PRIMARY KEY REFERENCES companies(id),
  geofencing_enabled INTEGER NOT NULL DEFAULT 1,
  photo_capture_enabled INTEGER NOT NULL DEFAULT 1,
  biometric_enabled INTEGER NOT NULL DEFAULT 1,
  offline_sync_enabled INTEGER NOT NULL DEFAULT 1,
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_lead_minutes INTEGER NOT NULL DEFAULT 15
);

-- departments --
CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- geofences --
CREATE TABLE geofences (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters REAL NOT NULL DEFAULT 70.0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- medical_certificates --
CREATE TABLE medical_certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  photo_url TEXT,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- offline_sync_queue --
CREATE TABLE offline_sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  punch_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT
);

-- punches --
CREATE TABLE punches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL CHECK(type IN ('entry','exit','break_start','break_end')),
  photo_url TEXT,
  latitude REAL,
  longitude REAL,
  gps_accuracy REAL,
  geofence_id TEXT,
  source TEXT NOT NULL CHECK(source IN ('web','mobile','rep','manual')),
  offline_synced INTEGER NOT NULL DEFAULT 0,
  sync_queue_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- schedule_assignments --
CREATE TABLE schedule_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  schedule_id TEXT NOT NULL REFERENCES work_schedules(id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- users --
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  department_id TEXT REFERENCES departments(id),
  cpf TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employee','manager','admin','rh')),
  pin_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- work_schedules --
CREATE TABLE work_schedules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
