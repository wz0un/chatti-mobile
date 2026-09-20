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
    ├── index.js        # Router/API: auth, contacts, rooms, DMs, webpush
    ├── ChatRoom.js     # Durable Object: salas de chat
    ├── DirectMessage.js# Durable Object: mensajes directos (encrypted relay)
    ├── WebPush.js      # VAPID + aes128gcm (RFC 8188/8291/8292) + envío
    ├── index.test.js   # Tests del API (incluye endpoints de webpush)
    └── WebPush.test.js # Tests known-answer del RFC 8291 y VAPID
```

## Web Push (Task 22)

El backend registra suscripciones de navegador (`POST /api/auth/webpush`) y
envía notificaciones con VAPID + cifrado `aes128gcm` (RFC 8188/8291/8292,
implementación cero-dependencias sobre WebCrypto en `src/WebPush.js`, fijada
byte-a-byte contra el vector del RFC 8291).

Contrato completo en `docs/WEB-PUSH.md`. Relación con el Service Worker web en
`shared/notifications/webPush.ts`.

### Configurar VAPID (1 vez, por entorno)

1. Generar el keypair ECDSA P-256 del backend:

   ```bash
   pnpm exec node -e "import('./src/WebPush.js').then(async m => console.log(JSON.stringify(await m.generateVapidKeys(), null, 2)))"
   ```

2. Fijar los secrets del worker (nunca en git):

   ```bash
   wrangler secret put VAPID_SUBJECT      # p.ej. mailto:admin@domain.com (mailto:/https: obligatorio)
   wrangler secret put VAPID_PUBLIC_KEY   # base64url P-256 pública (65 bytes)
   wrangler secret put VAPID_PRIVATE_KEY  # base64url P-256 privada (escalar de 32 bytes)
   ```

3. Sin estos secrets el worker **degrada controladamente**: las suscripciones
   se registran/guardan en KV pero no se envía nada (mismo comportamiento que
   reportó el QA antes de configurar VAPID).

### Flujo de baja

- El endpoint `POST /api/auth/webpush` con `action: "remove"` elimina la
  suscripción de KV; `deleteUser` purga todas las de un usuario al borrar la
  cuenta; y al enviar se purgan automáticamente los endpoints que devuelven
  `404/410 Gone`.

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