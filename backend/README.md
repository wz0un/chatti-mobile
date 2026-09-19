# Chatti Backend

Cloudflare Worker backend para Chatti (WebSocket + Durable Objects + SQLite).

Migrado desde el repo independiente `wz0un/chatti` (workers/) al monorepo
`chatti-mobile/backend`. El worker de producción despliega como
`chatti-workers` y es consumido por la app móvil (`src/`, `App.js`) y la web
(`web/`) vía los contratos de `shared/`.

## Stack

- Cloudflare Workers (runtime V8)
- Durable Objects con SQLite: `ChatRoom`, `DirectMessage`
- KV (`ROOMS_KV`): usuarios, contactos, salas, índices de conversaciones
- `bcryptjs` para hash de credenciales
- Tests: Vitest + `@cloudflare/vitest-pool-workers`

## Comandos

```bash
cd backend
pnpm install        # o npm install
pnpm dev            # wrangler dev (local, http://localhost:8787)
pnpm test           # vitest run
pnpm deploy         # wrangler deploy (solo con aprobación del Staff/DevOps)
```

## Estructura

```
backend/
├── wrangler.toml       # Config Cloudflare (bindings DO, KV, vars)
├── vitest.config.js    # Config de tests con pool workers
└── src/
    ├── index.js        # Router/API: auth, contacts, rooms, DMs
    ├── ChatRoom.js     # Durable Object: salas de chat
    ├── DirectMessage.js# Durable Object: mensajes directos (encrypted relay)
    └── index.test.js   # Tests del API
```

## Notas de despliegue

- `wrangler.toml` contiene bindings, KV id y vars de **producción**.
- El CI de este repo **ejecuta solo tests** en `backend/**`. El despliegue
  automático desde `master`/`dev` se habilitará cuando DevOps/Staff configuren
  los entornos de Cloudflare (DOs de staging, secretos, entornos wrangler).
- Hasta entonces, el deploy a producción se hace manualmente desde `backend/`
  con `pnpm deploy` tras aprobación explícita.

## Estado conocido

- Referencia técnica y plan de hardening: `docs/BACKEND-AUDIT.md` y
  `docs/BACKEND-HARDENING-PLAN.md`.
- BUG-01 (auth `503/1102`) auditado en `docs/QA-BUG01-RETEST.md`.