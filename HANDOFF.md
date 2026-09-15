# 🚀 pPonto — Phase 6 + Deploy Fix — Session Handoff

## ✅ DONE in this session
1. **Turso token fixed** — GH Pages env secret `VITE_TURSO_TOKEN` now holds a **fresh DB-scoped token** (minted 2026-09-12 via Turso API, sealed with GitHub Pages public key, `PUT 204` via `scripts/gh-update-secret.mjs`).
   - **IMPORTANT**: token in `.env`'s `VITE_TURSO_TOKEN` is **org-level** (`org_id:1000241710`, `id` in jwt payload `0feb...`)— do NOT use for DB. Instead:
   - `turso db tokens create pponto` → real DB token (starts `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnci...`).
   - In app client, wire format: `POST <db-url>` body `{"statements":[{"q":sql,"params":[...]}]}`, returns top-level **array** `[{results:{columns,rows,rows_affected}}]` or `{results}` object for single stmt.

2. **Live smoke test passed** (2026-09-12) — admin login (demo fallback, `99988877466/1234`) → dashboard → Configurações → "Novo Colaborador" → filled + submitted → "Teste Smoke QA" user visible in RBAC table.

3. **Deploy pipeline works** — Test (vitest 66 green) then Deploy (build with real Turso URL + fresh token) → GH Pages. Verified bundle contains real URL + NO demo markers.

## 🔍 Turso HTTP API notes (IMPORTANT)
- URL: `libsql://` → normalize to `https://` (client `httpUrl()`).
- **Params key is `params`**, NOT `args` — `args` causes `400`.
- Response is usually `[{results:{columns:[...], rows:[[...]], rows_affected}}]` (array even for single) or bare object.
- Batch endpoint `/batch` may 404 — use root with `statements` array.
- **Org/platform tokens FAIL (401 + "can't be decoded")** — must use DB-scoped token from `turso db tokens create`.

## 📋 Remaining
- [ ] Prove app actually writes to Turso (add-user smoke against REAL db, not demo). — token now DB-scoped should work.
- [ ] (Minor) `.playwright-mcp/` cleanup: already git-ignored; delete safely.
- [ ] Version bump: currently `1.47.0` — features added; consider bump to `1.48.0` (or follow CONTRIBUTING).

## 🧭 Repo map
- `src/core/turso-client.ts` — HTTP client (fixed)
- `src/api/data.ts` — data layer incl `createUser()` with demo fallback
- `scripts/gh-update-secret.mjs` — GH Pages secret updater (works)
- `scripts/turso-*.mjs` — token minting helpers
- `.github/workflows/deploy.yml` — injects secrets at build (VITE_TURSO_URL/TOKEN)