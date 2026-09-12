# pPonto

> **Registro de ponto dos funcionários** — Aplicação PWA para controle de jornada, homologação de atestados, ajustes de ponto e fechamento de folha com conformidade fiscal (Portaria 671 MTE).

---

## 📋 Visão Geral

O **pPonto** é uma aplicação Single Page Application (SPA) construída com **Vanilla TypeScript**, **Vite**, **Tailwind CSS v4** e **Turso (libSQL)**. Projetada como PWA com suporte offline, atende aos requisitos da Portaria 671 MTE para registro eletrônico de ponto (REP-P).

### Funcionalidades Principais

| Módulo | Descrição |
|--------|-----------|
| 📱 **Mobile (Funcionário)** | Bate-ponto biométrico (foto + GPS), espelho de ponto, solicitações de ajuste, atestados médicos |
| 🖥️ **Admin (Gestão)** | Dashboard KPIs, tratamento de ponto, ponto web, homologação de atestados, aprovação de ajustes |
| 📊 **Relatórios** | Analytics executivos, banco de horas (CLT §59), horas extras por departamento, previsto vs. efetivo |
| 📄 **Fechamento de Folha** | Exportação AFD (Art. 83), AFDT (Art. 84), ACJEF (Art. 85), layout ERP, trilha ICP-Brasil |
| 🗺️ **Cercas Virtuais** | Geofencing CRUD com mapa, raio configurável (30-500m), toggle ativo/inativo |
| 🔄 **Offline** | Fila IndexedDB, sincronização automática/manual, indicador visual de status |
| ⚙️ **Configurações** | Dados da empresa, feature flags, lembretes, matriz RBAC |

---

## 🏗️ Arquitetura

```
src/
├── main.ts                 # Entry point — router init, auth check, offline auto-drain
├── styles.css              # Tailwind v4 + "Precision Vanguard" design tokens
├── router.ts               # Hash router (#/path) com route guards por role
├── types.ts                # Interfaces TypeScript compartilhadas
├── config.ts               # Constantes (API URLs, feature flags)
│
├── core/                   # Infraestrutura compartilhada
│   ├── store.ts            # localStorage session cache
│   ├── turso-client.ts     # Cliente HTTP Turso (libSQL REST API)
│   ├── auth.ts             # Login/logout/session + role guards
│   └── offline.ts          # IndexedDB sync queue + background sync
│
├── api/
│   └── data.ts             # Queries tipadas + demo fallback (funciona sem Turso)
│
├── utils/
│   ├── time.ts             # Formatação, duração, banco de horas, haversine
│   └── fiscal.ts           # Geradores AFD/AFDT/ACJEF/folha (Portaria 671)
│
├── views/                  # View modules (cada um retorna HTMLElement)
│   ├── login.ts
│   ├── mobile/             # Shell mobile (max-w 420px, bottom tabs)
│   │   ├── punch.ts        # Bate-ponto biométrico
│   │   ├── espelho.ts      # Espelho de ponto
│   │   ├── solicitacoes.ts # Solicitações + atestados
│   │   └── ajuste.ts       # Ajuste de ponto
│   └── admin/              # Shell admin (sidebar + topbar)
│       ├── dashboard.ts    # KPIs executivos
│       ├── tratamento.ts   # Tratamento de ponto
│       ├── ponto-web.ts    # Ponto Web (câmera + GPS)
│       ├── homologacao.ts  # Homologação de atestados
│       ├── aprovacao.ts    # Aprovação de ajustes
│       ├── relatorios.ts   # Relatórios analíticos
│       ├── fechamento.ts   # Fechamento de folha
│       ├── cercas.ts       # Cercas virtuais
│       ├── offline.ts      # Contingência offline
│       └── configuracoes.ts# Configurações + RBAC
│
├── components/             # UI widgets reutilizáveis
│   ├── side-nav.ts         # Sidebar admin (badges vivos)
│   ├── top-bar.ts          # Top bar admin
│   ├── mobile-nav.ts       # Bottom tab bar mobile
│   ├── stat-card.ts        # KPI card (bento grid)
│   ├── punch-card.ts       # Linha de registro de ponto
│   ├── status-badge.ts     # Status pill
│   ├── modal.ts            # Modal dialog
│   └── toast.ts            # Toast notifications
│
└── test/                   # Unit tests (Vitest + jsdom)
    ├── store.test.ts
    ├── auth.test.ts
    ├── router.test.ts
    ├── time.test.ts
    ├── data.test.ts
    └── views/punch.test.ts
```

### Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| SPA Framework | Vanilla TypeScript | Zero runtime deps, cold-start rápido |
| Styling | Tailwind v4 CSS-first | Design system "Precision Vanguard" via `@theme` |
| Routing | Hash router (`#/path`) | Sem config servidor, funciona GitHub Pages + SW |
| Database | Turso (libSQL over HTTP) | Serverless, free tier, SQLite-compatível |
| Offline | IndexedDB + Service Worker | PWA offline per BRD §3.1.C |
| Icons | Material Symbols Outlined | Match Stitch designs, via Google Fonts |
| Auth | PIN-based (RBAC) | Simples, por BRD §3.1.B |

---

## 🗄️ Banco de Dados

### Estratégia Dev/Prod

| Ambiente | Database | Hostname |
|----------|----------|----------|
| **Desenvolvimento** | `pponto` | `pponto-felipeumbra.aws-ap-northeast-1.turso.io` |
| **Produção** | `pponto-prod` | `pponto-prod-felipeumbra.aws-ap-northeast-1.turso.io` |

> ⚠️ **Importante**: Use **database-scoped tokens** (`turso db tokens create <db>`), não management tokens da organização.

### Schema Principal

```sql
companies              -- Tenant (CNPJ, endereço)
departments            -- Estrutura organizacional
users                  -- Funcionários + gestores + admin + RH (CPF, role, PIN)
work_schedules         -- Definições de turno (8h, 6h, duplo, flex WFH)
schedule_assignments   -- Usuário → schedule com vigência
punches                -- Eventos de ponto (entrada/saída/intervalo) com GPS, foto, source
geofences              -- Perímetros virtuais
medical_certificates   -- Atestados com workflow (pending/approved/rejected)
adjustment_requests    -- Solicitações de correção com review workflow
offline_sync_queue     -- Fila de punches offline móvel
company_settings       -- Feature flags (geofencing, foto, biométrico, lembretes)
```

### Dados de Seed (Destaques)

- **Ponto faltando**: Roberto (usr-006) — saída 22/10 não registrada → requer correção
- **Entrada faltando**: Lucas (usr-004) — 21/10 completamente ausente → ajuste pendente
- **Fora da cerca**: Camila (usr-009) — viagem Rio 23/10, fora cerca Paulista → pendente
- **Offline**: Fernanda (usr-007) — 1 punch na fila de sincronização
- **Atestados**: 2 pendentes, 2 aprovados, 1 rejeitado (com observações do admin)

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 20+
- **npm** 10+
- Conta **Turso** (para banco de dados) ou use o modo demo

### Instalação

```bash
# Clone o repositório
git clone https://github.com/felipeUmbra/pponto.git
cd pponto

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Turso (opcional - funciona em modo demo sem elas)

# Desenvolvimento
npm run dev          # Inicia Vite dev server em http://localhost:5173

# Build de produção
npm run build        # Gera pasta dist/

# Preview do build
npm run preview      # Serve dist/ localmente
```

### Variáveis de Ambiente

```bash
# .env (desenvolvimento)
VITE_TURSO_URL=libsql://pponto-felipeumbra.aws-ap-northeast-1.turso.io
VITE_TURSO_TOKEN=seu_token_aqui

# .env.production (produção)
VITE_TURSO_URL=libsql://pponto-prod-felipeumbra.aws-ap-northeast-1.turso.io
VITE_TURSO_TOKEN=token_producao_aqui
```

> **Modo Demo**: Se as variáveis não estiverem definidas ou o Turso estiver inacessível, a aplicação usa automaticamente um dataset em memória para que todos os fluxos permaneçam testáveis.

---

## 🧪 Testes

```bash
# Unit tests (Vitest + jsdom)
npm test              # Executa uma vez
npm run test:watch    # Modo watch
npm run test:coverage # Com cobertura

# E2E tests (Playwright)
npm run test:e2e      # Executa testes críticos (login → punch → espelho; admin flows)
npm run test:e2e:ui   # Abre UI do Playwright
```

### Cobertura Atual

- **Unit tests**: 59 testes passando (store, auth, router, time, data, punch)
- **E2E tests**: 2 fluxos críticos (mobile + admin)

---

## 🔧 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server Vite (HMR) |
| `npm run build` | Build produção (dist/) |
| `npm run preview` | Preview do build local |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests watch mode |
| `npm run test:coverage` | Unit tests + cobertura |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:e2e:ui` | E2E tests com UI |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint + auto-fix |
| `npm run typecheck` | TypeScript check (tsc --noEmit) |

---

## 📦 Deploy

### GitHub Pages (estático)

O projeto está configurado para deploy automático via GitHub Actions no push para `main`:

```yaml
# .github/workflows/ci.yml
- Build → Typecheck → Lint → Test → Deploy to GitHub Pages
```

### Netlify / Vercel / Cloudflare Pages

Conecte o repositório e configure:

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables**: `VITE_TURSO_URL`, `VITE_TURSO_TOKEN` (produção)

### PWA

- **Service Worker**: `public/sw.js` (v3 - precache shell + icons + offline fallback)
- **Manifest**: `public/manifest.webmanifest` (maskable icons 192/512)
- **Ícones**: `public/icons/` (gerados via `node scripts/gen-icons.mjs`)

---

## 🗂️ Fases de Desenvolvimento

| Fase | Status | Entregáveis |
|------|--------|-------------|
| **1** | ✅ | Core infra: router, auth, Turso client, offline, layout shells |
| **2** | ✅ | 4 views mobile: punch, espelho, solicitações, ajuste (44 testes) |
| **3** | ✅ | 5 views admin: dashboard, tratamento, ponto-web, homologação, aprovação |
| **4** | ✅ | 5 views admin: relatórios, fechamento, cercas, offline, configurações |
| **5** | ✅ | PWA: SW v3, maskable icons, manifest, E2E, CI/CD |
| **6** | 📋 | UX/UI: icon font, a11y, empty states, skeletons, responsive audit |

> Ver `DEVELOPMENT_PLAN.md` para detalhes completos de cada fase.

---

## 🛠️ Ferramentas de Desenvolvimento

### Scripts Turso (`scripts/`)

| Script | Uso |
|--------|-----|
| `turso-create-prod.mjs` | Cria database produção com mesmo schema |
| `turso-dump-schema.mjs` | Exporta schema SQL do database atual |
| `turso-mint-token.mjs` | Gera token database-scoped |
| `turso-doctor.mjs` | Health check completo (conectividade, token, tabelas, seeds) |
| `gen-icons.mjs` | Gera ícones PWA (192/512 + maskable) a partir do `clock.svg` |

```bash
# Exemplos
node scripts/turso-doctor.mjs           # Verifica saúde do DB dev
node scripts/turso-create-prod.mjs      # Cria DB produção
node scripts/gen-icons.mjs              # Regenera ícones PWA
```

---

## 👥 Usuários de Teste (Seed Data)

| Usuário | Role | CPF | PIN | Departamento |
|---------|------|-----|-----|--------------|
| Pedro Augusto | Admin | 99988877766 | 1234 | RH |
| Mariana Alencar | RH | 12345678901 | 1234 | RH |
| Carlos Medeiros | Manager | 23456789012 | 1234 | RH |
| Ana Beatriz Souza | Employee | 35470291012 | 1234 | Tecnologia |
| Lucas Ferreira | Employee | 45678901234 | 1234 | Tecnologia |
| Juliana Costa | Manager | 56789012345 | 1234 | Comercial |
| Roberto Nascimento | Employee | 67890123456 | 1234 | Operações |
| Fernanda Lima | Employee | 78901234567 | 1234 | Operações |
| Camila Rocha | Employee | 89012345678 | 1234 | Comercial |
| Rafael Mendes | Employee | 90123456789 | 1234 | Tecnologia |

---

## 📚 Documentação Adicional

- [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) — Plano detalhado com arquitetura, schema, fases, mapeamento BRD
- [`CHANGELOG.md`](CHANGELOG.md) — Histórico de mudanças (a ser criado)

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

### Padrões de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação (sem mudança de lógica)
refactor: refatoração
test: testes
chore: manutenção
```

---

## 📄 Licença

MIT License — veja [LICENSE](LICENSE) para detalhes.

---

## 🏢 Autor

**UmbranDigital** — [@felipeUmbra](https://github.com/felipeUmbra)

---

## 🙏 Agradecimentos

- [Turso](https://turso.tech/) — Database serverless libSQL
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Vite](https://vite.dev/) — Build tool rápida
- [Vitest](https://vitest.dev/) — Test framework
- [Playwright](https://playwright.dev/) — E2E testing
- [Material Symbols](https://fonts.google.com/icons) — Iconografia