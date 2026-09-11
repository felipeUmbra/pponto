# Ponto Dot8 — Development Plan

> **Architecture:** Vanilla TypeScript SPA + Vite + Tailwind v4 + Turso (libSQL)
> **Design System:** "Precision Vanguard" (Inter + JetBrains Mono, navy/cobalt/emerald)
> **Target:** PWA with offline contingency, mobile-first responsive
> **Language:** pt-BR throughout

---

## 1. Architecture Overview

```
src/
├── main.ts                  # SPA entry — router init, auth check
├── styles.css               # Tailwind v4 with "Precision Vanguard" @theme tokens
├── router.ts                # Lightweight hash router
├── types.ts                 # Shared TypeScript interfaces
├── config.ts                # Constants (API URLs, feature flags)
│
├── core/                    # Shared infrastructure
│   ├── store.ts             # localStorage session cache (client-side session)
│   ├── turso-client.ts      # Turso HTTP client (REST API fetch wrapper)
│   ├── auth.ts              # Login/logout/session management
│   └── offline.ts           # IndexedDB offline sync queue
│
├── views/                   # Route-bound view modules (each returns HTMLElement)
│   ├── login.ts             # /login — authentication screen
│   ├── mobile/              # Employee mobile views (max-w 420px)
│   │   ├── punch.ts         # Biometric clock-in (camera + GPS + offline)
│   │   ├── espelho.ts       # Espelho de ponto (time mirror)
│   │   ├── solicitacoes.ts  # Solicitações + atestados
│   │   └── ajuste.ts        # Request punch adjustment
│   └── admin/               # Management desktop views (sidebar nav)
│       ├── dashboard.ts     # /admin — HR overview dashboard
│       ├── tratamento.ts    # Tratamento de ponto (validate punches)
│       ├── homologacao.ts   # Homologação de atestados (RH)
│       ├── aprovacao.ts     # Aprovação de ajustes
│       ├── relatorios.ts    # Relatórios analíticos + banco de horas
│       ├── fechamento.ts    # Fechamento de folha + AFD/AFDT export
│       ├── cercas.ts        # Cercas virtuais (geofencing config)
│       └── configuracoes.ts # Company settings + RBAC
│
├── components/              # Reusable UI widgets
│   ├── side-nav.ts          # Admin sidebar
│   ├── top-bar.ts           # Admin top bar
│   ├── mobile-nav.ts        # Mobile bottom tab bar
│   ├── stat-card.ts         # Metric KPI card
│   ├── punch-card.ts        # Punch record row
│   ├── status-badge.ts      # Status pill (pending/approved/rejected)
│   ├── modal.ts             # Modal dialog
│   └── toast.ts             # Toast notification
│
└── test/                    # Unit tests (Vitest + jsdom)
    ├── store.test.ts
    ├── auth.test.ts
    ├── router.test.ts
    └── views/punch.test.ts
```

### Key architectural decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SPA framework | None (vanilla TS) | Zero runtime deps, fast cold-start, keeps existing Vitest/ESLint config |
| Styling | Tailwind v4 CSS-first tokens | Designs are built with Tailwind; custom `@theme` block matches "Precision Vanguard" |
| Routing | Hash router (`#/path`) | No server config needed, works with GitHub Pages + service worker |
| Data layer | Turso (libSQL over HTTP) | Serverless edge DB, free tier, SQLite-compatible, maps cleanly to BRD entities |
| Offline | IndexedDB queue + SW cache | PWA offline mode as per BRD §3.1.C "Contingência Offline" |
| Icons | Material Symbols Outlined (Google Fonts) | Matches all Stitch screen designs |
| Auth | PIN-based (BRD §3.1.B RBAC) | Simple employee PIN login; role-based view routing |

---

## 2. Database Schema Summary

Created and populated in Turso `pponto` (hostname: `pponto-felipeumbra.aws-ap-northeast-1.turso.io`).

| Table | Rows | Purpose |
|-------|------|---------|
| `companies` | 1 | Tenant (CNPJ, address) |
| `departments` | 4 | Org structure (RH, Tech, Commercial, Ops) |
| `users` | 10 | Employees + managers + admin + RH (CPF, role, PIN) |
| `work_schedules` | 4 | Shift definitions (8h commercial, 6h morning, double, flex WFH) |
| `schedule_assignments` | 10 | User → schedule with date range |
| `punches` | 53 | Clock events (entry/exit/break) with GPS, photo, source |
| `geofences` | 3 | Virtual perimeters (Paulista, Santos, Tech Hub) |
| `medical_certificates` | 5 | Atestados with status workflow (pending/approved/rejected) |
| `adjustment_requests` | 5 | Punch correction requests with review workflow |
| `offline_sync_queue` | 1 | Pending mobile offline punches |
| `company_settings` | 1 | Feature flags (geofencing, photo, biometric, reminders) |

### Seed data highlights

- **Missing exit punch:** usr-006 (Roberto) — Oct 22 REP did not register exit → requires correction
- **Missing entry:** usr-004 (Lucas) — Oct 21 completely missed → adjustment request pending approval
- **Out-of-geofence:** usr-009 (Camila) — Oct 23 Rio trip, outside Paulista geofence → pending
- **Offline contingency:** usr-007 (Fernanda) — one queued offline punch in sync table
- **Medical certs:** 2 pending, 2 approved, 1 rejected (with admin review notes)

---

## 3. Module Breakdown & Phases

### Phase 1 — Core Infrastructure (Foundation)
**Files:** `router.ts`, `types.ts`, `config.ts`, `core/*`, `components/side-nav.ts`, `components/top-bar.ts`, `components/mobile-nav.ts`

| Work item | Description |
|-----------|-------------|
| Hash router | `#/login`, `#/ponto`, `#/espelho`, `#/solicitacoes`, `#/admin/*` — route guards by role |
| Turso HTTP client | Fetch wrapper for libSQL HTTP API, typed query helpers |
| Auth module | PIN login → session in localStorage, role-based route guards |
| Offline module | IndexedDB queue for punches; sync on reconnect |
| Layout shells | Mobile shell (bottom tabs, max 420px) + Admin shell (sidebar + topbar) |

### Phase 2 — Employee Mobile Views
**Screens:** #11 (Bate-Ponto Biométrico), #10 (Espelho de Ponto), #08 (Solicitação Ajuste), #02–#05 (Atestado flow)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Biometric punch | #11 | §3.1.A (Photo-proof, GPS, facial recognition) |
| Espelho de ponto | #10 | Punch history calendar with daily totals |
| Solicitações & Atestados | #10 lower tabs | §3.2 (Leave request management) |
| Solicitação de ajuste | #08 | §3.1.B (Manual hour adjustment request) |
| Camera + Atestado capture | #02, #03, #04, #05 | §3.2 (In-app leave requests with photo) |

### Phase 3 — Admin Dashboard & Tratamento
**Screens:** #01 (Dashboard), #07 (Homologação), #09 (Aprovação), #06 (Ponto Web)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Dashboard KPIs | #01 | §3.2 (Custom analytical reporting) |
| Tratamento de ponto | #01 main area | Missing punches, divergences, day-by-day grid |
| Web punch (camera+GPS) | #06 | §3.1.A + §4.1 (Web clock-in journey) |
| Homologação atestados | #07 | §3.2 (Medical certificate review workflow) |
| Aprovação ajustes | #09 | §3.1.B (HR review + approve/reject) |

### Phase 4 — Reports, Compliance & Settings
**Screens:** #17 (Relatórios), #12 (Fechamento), #13 (Cercas), #14 (Offline)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Relatórios analíticos | #17 | §5 (Analytics traceability matrix) |
| Banco de horas | #17 lower | Hour bank balance per employee |
| Fechamento de folha | #12 | §3.1.C (Fiscal file generation AFD/ACJEF) |
| Cercas virtuais | #13 | §3.1.B (Geofencing configuration) |
| Offline contingency | #14 | §3.1.C + §4.2 (Offline mode, sync queue) |
| Configurações | — | Company settings, RBAC, reminder config |

### Phase 5 — PWA Hardening & CI/CD
| Work item | Description |
|-----------|-------------|
| Service worker | Update `sw.js` to precache app shell + offline fallback |
| Manifest icons | Add maskable icon set (192, 512) for install prompt |
| E2E tests | Playwright tests for: login → punch → espelho; admin dashboard flows |
| Unit tests | Vitest coverage for store, auth, router, time calculations |
| CI pipeline | GitHub Actions: typecheck + lint + test + build on push to main |

---

## 4. Key BRD-to-Implementation Mappings

| BRD Requirement | Implementation |
|-----------------|----------------|
| §3.1.A Photo-proof clock-in | `getUserMedia({ video: true })` → canvas capture → base64 |
| §3.1.A Facial recognition | Placeholder: photo stored, matching deferred to future AI integration |
| §3.1.A Geolocation | `navigator.geolocation.getCurrentPosition()` → lat/lng/accuracy |
| §3.1.B RBAC | `users.role` column → route guards: `admin`/`rh` see admin shell, `employee`/`manager` see mobile |
| §3.1.B Geofencing | Client-side Haversine distance check vs `geofences` table |
| §3.1.C Fiscal files | AFD/ACJEF export generators (structured text files per MTE spec) |
| §3.1.C REP sync | `punches.source = 'rep'` — ingested from physical clocks |
| §3.2 Leave management | `medical_certificates` CRUD with status workflow |
| §3.2 Analytical reporting | `punches` aggregation → overtime, absences, hour bank calculations |
| §4.1 Web clock-in | Full flow: auth → camera → GPS → register → confirmation modal |
| §4.2 Mobile offline | IndexedDB queue → SW background sync → visual sync status indicator |

---

## 5. Seed User Quick-Reference

| User | Role | Department | Schedule | Notable seed data |
|------|------|------------|----------|-------------------|
| Mariana Alencar | RH | Recursos Humanos | Comercial 8h | Admin reviewer, 4 full days of punches |
| Carlos Medeiros | Manager | Recursos Humanos | Comercial 8h | Approves adjustment requests |
| Ana Beatriz Souza | Employee | Tecnologia | Home Office Flex | WFH + office mix, mixed GPS |
| Lucas Ferreira | Employee | Tecnologia | Comercial 8h | Missing Oct 21 entry → adjustment pending |
| Juliana Costa | Manager | Comercial | Comercial 8h | — |
| Roberto Nascimento | Employee | Operações | Manhã 6h | Missing Oct 22 exit → REP fault |
| Fernanda Lima | Employee | Operações | Turno Duplo | One offline sync pending |
| Pedro Augusto | Admin | Recursos Humanos | Comercial 8h | Super-admin role |
| Camila Rocha | Employee | Comercial | Home Office Flex | Out-of-geofence Oct 23 Rio trip |
| Rafael Mendes | Employee | Tecnologia | Home Office Flex | Consistent WFH, no GPS |

---

## 6. Development Sequence (recommended execution order)

```
1. ✅ Turso DB created + schema + seed data     ← DONE
2. ✅ Turso HTTP client in src/core/turso-client.ts  ← Phase 1
3. ✅ Types + config + hash router              ← Phase 1
4. ✅ Auth module + login view                  ← Phase 1 (static shell)
5. ✅ Mobile shell (bottom nav) + punch view    ← Phase 1 (placeholder)
6. ✅ Admin shell (sidebar) + dashboard view    ← Phase 1 (placeholder)
7. 🔲 Espelho de ponto view                     ← Phase 2
8. 🔲 Solicitação de ajuste view                ← Phase 2
9. 🔲 Tratamento de ponto (admin) view          ← Phase 3
10. 🔲 Homologação atestados view               ← Phase 3
11. 🔲 Aprovação ajustes view                   ← Phase 3
12. 🔲 Relatórios analíticos + banco de horas view  ← Phase 4
13. 🔲 Fechamento de folha + fiscal export view ← Phase 4
14. 🔲 Cercas virtuais config view              ← Phase 4
15. 🔲 Offline module (IndexedDB + sync status) ← Phase 1 done, UI Phase 4
16. 🔲 Web punch view (camera + GPS)            ← Phase 3
17. 🔲 PWA hardening (SW, icons, manifest)      ← Phase 5
18. 🔲 Tests + CI/CD                            ← Phase 5
```

---

## 7. Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `TURSO_DATABASE_URL` | `libsql://pponto-felipeumbra.aws-ap-northeast-1.turso.io` | Runtime config for HTTP client |
| `TURSO_AUTH_TOKEN` | *(to be generated via `turso db tokens create pponto`)* | Auth token for Turso API |

> **Phase 1 deliverable:** All core infrastructure files below are implemented, typechecked, linted, and unit-tested.
> Runtime DB connectivity needs `VITE_TURSO_URL` + `VITE_TURSO_TOKEN` in `.env` (see `.env.example`).
