# pPonto — Development Plan

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
├── api/                     # Data access layer
│   └── data.ts              # Typed queries + demo fallback (works w/o Turso)
│
├── utils/
│   └── time.ts              # Formatting, duration math, bank-hours, haversine
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
│       ├── tratamento.ts    # Tratamento de ponto (validate punches)        ├── ponto-web.ts     # /admin/ponto-web — Web clock-in (camera+GPS)│       ├── homologacao.ts   # Homologação de atestados (RH)
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
│   ├── stat-card.ts         # Metric KPI card (bank hours bento tiles)
│   ├── punch-card.ts        # Punch record row (Entrada/Saída grid)
│   ├── status-badge.ts      # Status pill (pending/approved/rejected)
│   ├── modal.ts             # Modal dialog
│   └── toast.ts             # Toast notification
│
└── test/                    # Unit tests (Vitest + jsdom, co-located *.test.ts)
    ├── store.test.ts
    ├── auth.test.ts
    ├── router.test.ts
    ├── time.test.ts
    ├── data.test.ts
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

> **Database strategy (dev/prod separation):**
> - `pponto` (dev/test) — current working DB with seed data. Used during development.
> - `pponto-prod` (production) — `pponto-prod-felipeumbra.aws-ap-northeast-1.turso.io`, created with the same schema; reserved for release deploys. Use `.env.production` with `VITE_TURSO_URL`/`VITE_TURSO_TOKEN` pointing at prod.
> - Token note: the libsql HTTP endpoint requires a **database-scoped** token (`turso db tokens create <db>`), not an Org management token.

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

### Phase 2 — Employee Mobile Views ✅ (implemented)
**Screens:** #11 (Bate-Ponto Biométrico), #10 (Espelho de Ponto), #08 (Solicitação Ajuste), #02–#05 (Atestado flow)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Biometric punch | #11 | §3.1.A (Photo-proof, GPS, facial recognition) |
| Espelho de ponto | #10 | Punch history calendar with daily totals |
| Solicitações & Atestados | #10 lower tabs | §3.2 (Leave request management) |
| Solicitação de ajuste | #08 | §3.1.B (Manual hour adjustment request) |
| Camera + Atestado capture | #02, #03, #04, #05 | §3.2 (In-app leave requests with photo) |

**Delivered:** live clock (Brasília), `getUserMedia` camera capture → base64, geolocation + Haversine geofence check, offline IndexedDB queue fallback, punch types auto-cycle (Entrada → Intervalo → Retorno → Saída), month calendar with daily punch grids, bank-hours bento summary, filter tabs with counts, atestado + ajuste history, adjustment request form with missing-punch preselect. All four views verified end-to-end against live Turso data.

### Phase 3 — Admin Dashboard & Tratamento ✅ (implemented)
**Screens:** #01 (Dashboard), #06 (Ponto Web), #07 (Homologação), #09 (Aprovação)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Dashboard KPIs | #01 | §3.2 (Custom analytical reporting) |
| Tratamento de ponto | #01 main area | Missing punches, divergences, day-by-day grid |
| Web punch (camera+GPS) | #06 | §3.1.A + §4.1 (Web clock-in journey) |
| Homologação atestados | #07 | §3.2 (Medical certificate review workflow) |
| Aprovação ajustes | #09 | §3.1.B (HR review + approve/reject) |

**Delivered:** live KPI bento grid (presentes, atestados pendentes, ajustes pendentes, divergências), per-employee treatment table with inconsistency badges (missing exit/entry), review buttons for certificates and adjustments with badge-decrement on approve/reject, full Ponto Web screen (Stitch #06) with live Brasília clock, anti-fraud camera viewport with liveness badge, geofence map + telemetry, shift slot selector with next-action ping, insert punch (source `web`), and Portaria 671 receipt preview. All five admin views verified end-to-end against live Turso data.

### Phase 4 — Reports, Compliance & Settings ✅ (implemented)
**Screens:** #17 (Relatórios), #12 (Fechamento), #13 (Cercas), #14 (Offline)

| View | Screen ref | BRD mapping |
|------|------------|-------------|
| Relatórios analíticos | #17 | §5 (Analytics traceability matrix) |
| Banco de horas | #17 lower | Hour bank balance per employee |
| Fechamento de folha | #12 | §3.1.C (Fiscal file generation AFD/ACJEF) |
| Cercas virtuais | #13 | §3.1.B (Geofencing configuration) |
| Offline contingency | #14 | §3.1.C + §4.2 (Offline mode, sync queue) |
| Configurações | — | Company settings, RBAC, reminder config |

**Delivered:** executive KPI bento (saldo geral, HE, absenteísmo, vencimentos), horas extras por departamento bar chart, previsto-vs-efetivo weekly comparison, extrato de banco de horas por colaborador with CLT §59 split (50%/100%), CSV exports; fechamento de folha workflow ribbon (4 etapas), Portaria 671 MTE export cards (AFD Art. 83, AFDT Art. 84, ACJEF Art. 85, layout folha ERP) with download, ICP-Brasil lot audit trail with SHA-256; cercas virtuais map with radial zones, CRUD + raio slider (30–500m) + active toggle; contingência offline status card with live queue count + manual/auto sync drain; configurações with company card, feature-flag toggles, reminder lead-time, RBAC matrix. All five admin views verified end-to-end; Turso queries degrade gracefully to demo dataset when the token is invalid/unreachable.

### Phase 5 — PWA Hardening & CI/CD (in progress)
| Work item | Description |
|-----------|-------------|
| Service worker | Update `sw.js` to precache app shell + offline fallback |
| Manifest icons | Add maskable icon set (192, 512) for install prompt |
| E2E tests | Playwright tests for: login → punch → espelho; admin dashboard flows |
| Unit tests | Vitest coverage for store, auth, router, time calculations |
| CI pipeline | GitHub Actions: typecheck + lint + test + build on push to main |

### Phase 6 — UX/UI Polish & Accessibility (planned)
**Goal:** Fix the missing icon rendering and bring the interface to production visual quality.

| Work item | Description |
|-----------|-------------|
| Icon font | Load **Material Symbols Outlined** (Google Fonts) in `index.html` + define `.material-symbols-outlined` font class in `styles.css` — fixes the ~147 invisible icons across 23 files (sidebar: `dashboard`, `fingerprint`, `how_to_reg`, `medical_services`, `cloud_off`, `cloud_done`, `verified_user`, etc.) |
| Icon audit | Sweep all `.material-symbols-outlined` usages; replace any outdated glyph names (e.g. `progress_activity` → `autorenew`, `pace` → `speed`) |
| Icon fallback | Add a self-hosted fallback / ligature subset so icons render offline (PWA) |
| Empty states | Illustrate blank states (no data screens) with branded graphics instead of bare text |
| Focus & a11y | Keyboard focus rings, `aria-label` on icon-only buttons, contrast pass on `text-outline` captions, `prefers-reduced-motion` |
| Loading skeletons | Replace "Carregando…" text with shimmer skeleton blocks for async admin views |
| Responsive audit | Table overflow on small admin viewports; mobile safe-area insets; touch targets ≥ 44px |
| Evidence screenshots | Capture before/after icons (`evidence_icon1.png` / `evidence_icon2.png` are the "before" evidence) |

**Root cause (verified):** `index.html` loads no Google Fonts; `styles.css` has no `.material-symbols-outlined` font-family rule. All icon spans render as empty inline text.

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
5. ✅ Mobile shell (bottom nav) + punch view    ← Phase 1 (placeholder) / Phase 2 (biometric)
6. ✅ Admin shell (sidebar) + dashboard view    ← Phase 1 (placeholder)
7. ✅ Espelho de ponto view                     ← Phase 2
8. ✅ Solicitação de ajuste view                ← Phase 2
9. ✅ Solicitações & atestados view             ← Phase 2
10. ✅ Tratamento de ponto (admin) view          ← Phase 3
11. ✅ Homologação atestados view               ← Phase 3
12. ✅ Aprovação ajustes view                   ← Phase 3
13. ✅ Relatórios analíticos + banco de horas view  ← Phase 4
14. ✅ Fechamento de folha + fiscal export view ← Phase 4
15. ✅ Cercas virtuais config view              ← Phase 4
16. ✅ Offline module (IndexedDB + sync status) ← Phase 1 done, UI Phase 4
17. ✅ Web punch view (camera + GPS)            ← Phase 3
18. ✅ Configurações (settings + RBAC)          ← Phase 4
19. 🔲 PWA hardening (SW, icons, manifest)      ← Phase 5 (in progress)
20. 🔲 E2E + CI/CD                              ← Phase 5
21. 🔲 Icon font + UX/UI polish (missing icons)  ← Phase 6
22. 🔲 A11y + responsive + empty states          ← Phase 6
```

---

## 7. Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `TURSO_DATABASE_URL` | `libsql://pponto-felipeumbra.aws-ap-northeast-1.turso.io` | Runtime config for HTTP client |
| `TURSO_AUTH_TOKEN` | *(to be generated via `turso db tokens create pponto`)* | Auth token for Turso API |

> **Phase 1 deliverable:** All core infrastructure files below are implemented, typechecked, linted, and unit-tested.
> **Phase 2 deliverable:** All four employee mobile views (punch, espelho, solicitações, ajuste) implemented, unit-tested (44 tests), and verified end-to-end against live Turso data.
> **Phase 3 deliverable:** All five admin views (dashboard KPIs, tratamento, ponto-web, homologação, aprovação) implemented, typechecked (tsc), linted (ESLint 0 warnings), 44/44 tests passing, production build green.
> Runtime DB connectivity needs `VITE_TURSO_URL` + `VITE_TURSO_TOKEN` in `.env` (see `.env.example`). When absent or unreachable, the app auto-falls back to an in-memory demo dataset so every flow remains testable.
