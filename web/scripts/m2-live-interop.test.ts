/**
 * M2 — LIVE web ⇄ móvil interop (interactivo, worker real).
 *
 * Dos fases (M2_PHASE):
 *   - `setup`   : registra usuario web desechable, resuelve mohsine#0001, crea
 *                 sala, la une por WS real, envía bienvenida en sala + DM cifrado
 *                 web→móvil + solicitud de contacto. Persiste estado en
 *                 /tmp/chatti-qa/m2-live.json e imprime el NOMBRE DE LA SALA.
 *   - `observe` : re-login del MISMO usuario web, reconecta sala + DM y escucha
 *                 ~OBSERVE_MS imprimiendo cada evento en vivo (user_joined del
 *                 móvil, mensajes del móvil, typing, presencia, DM entrante).
 *
 * Uso:
 *   M2_PHASE=setup   vitest run --config scripts/m2live.vitest.config.ts
 *   M2_PHASE=observe vitest run --config scripts/m2live.vitest.config.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { AuthService } from '../../shared/auth/AuthService';
import { ApiService } from '../../shared/api/ApiService';
import { EncryptionService } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';
import { DirectMessageSocket } from '../../shared/ws/DirectMessageSocket';
import { RoomSocket } from '../../shared/ws/RoomSocket';
import type { WsFactory, WsLike } from '../../shared/ws/WsTypes';

const baseUrl = (
  process.env.VITE_API_URL ?? 'https://chatti-workers.wz0un.workers.dev'
).replace(/\/+$/, '');

const PHASE = process.env.M2_PHASE ?? 'setup';
const OBSERVE_MS = Number(process.env.M2_OBSERVE_MS ?? 150_000);
const PASSWORD = 'm2-live-webqa-pass';
const MOBILE_TARGET = 'mohsine#0001';

const STATE_DIR = join(tmpdir(), 'chatti-qa');
const STATE_FILE = join(STATE_DIR, 'm2-live.json');

interface M2LiveState {
  username: string;
  fullUsername: string;
  userId: string;
  roomId: string;
  roomName: string;
  conversationId: string;
  peerUserId: string;
}

const wsFactory: WsFactory = (url) =>
  new (globalThis as unknown as { WebSocket: new (u: string) => WsLike }).WebSocket(url);

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe(`M2 live web ⇄ móvil interop (fase: ${PHASE})`, () => {
  const sockets: Array<{ disconnect(): void }> = [];

  afterAll(() => {
    for (const s of sockets) {
      try {
        s.disconnect();
      } catch {
        /* noop */
      }
    }
  });

  it(
    PHASE === 'setup' ? 'prepara sala + DM cifrado + contacto para el móvil' : 'observa sala + DM en vivo',
    async () => {
      ApiService.configure(baseUrl);

      if (PHASE === 'setup') {
        const storage = new MemoryStorageAdapter();
        const encryption = new EncryptionService(storage);
        const auth = new AuthService(storage, encryption);

        const base = `m2web${Date.now().toString(36)}`;
        const user = await auth.registerUser(base, PASSWORD);
        console.log(`[setup] usuario web: ${user.fullUsername} (${user.userId})`);

        const peer = await ApiService.findUserByUsername(MOBILE_TARGET);
        expect(peer).not.toBeNull();
        console.log(`[setup] peer móvil: ${peer!.fullUsername} (${peer!.userId})`);
        console.log(`[setup] peer raw: ${JSON.stringify(peer)}`);

        const room = await ApiService.createRoom(`${base}-sala`, user.fullUsername);
        expect(room.id).toBeTruthy();
        console.log(`[setup] sala creada: "${room.name}" (${room.id})`);

        // join room via real WS + welcome
        const roomSocket = new RoomSocket({ wsFactory });
        const roomReady = new Promise<void>((res) => roomSocket.on('connected', () => res()));
        roomSocket.connect(room.id, user.fullUsername, user.userId, baseUrl);
        await roomReady;
        sockets.push(roomSocket);
        roomSocket.sendMessage(
          `👋 Bienvenido mohsine#0001 — entra a esta sala desde tu móvil y escribe "hola" (QA web⇄móvil en vivo).`,
        );
        console.log('[setup] bienvenida enviada a la sala');

        // encrypted DM web → móvil
        const started = await ApiService.startDirectMessage(user.userId, peer!.userId);
        expect(started.conversationId).toBeTruthy();
        const peerKey = await ApiService.getPublicKey(peer!.userId);
        expect(peerKey).toBeTruthy();
        const dmSocket = new DirectMessageSocket({ wsFactory, encryption });
        const dmReady = new Promise<void>((res) => dmSocket.on('connected', () => res()));
        await dmSocket.connect(
          started.conversationId,
          user.userId,
          user.fullUsername,
          peer!.userId,
          baseUrl,
          peerKey ?? undefined,
        );
        await dmReady;
        sockets.push(dmSocket);
        await dmSocket.sendMessage(
          `🔐 DM cifrado web→móvil: entra a la sala "${room.name}" y escribe "hola".`,
        );
        console.log('[setup] DM cifrado enviado al móvil');

        // contact request web → móvil (no fatal: backend 404 on stale deviceId — see QA note)
        try {
          const req = await ApiService.sendContactRequest(user.userId, peer!.deviceId, user.fullUsername);
          console.log(`[setup] solicitud de contacto: ${JSON.stringify(req)}`);
        } catch (err) {
          console.warn(`[setup] contacto NO enviado (backend): ${(err as Error).message}`);
        }

        mkdirSync(STATE_DIR, { recursive: true });
        writeFileSync(
          STATE_FILE,
          JSON.stringify(
            {
              username: base,
              fullUsername: user.fullUsername,
              userId: user.userId,
              roomId: room.id,
              roomName: room.name,
              conversationId: started.conversationId,
              peerUserId: peer!.userId,
            } satisfies M2LiveState,
            null,
            2,
          ),
        );

        console.log(`\n═══════════════════════════════════════════`);
        console.log(`  SALA: "${room.name}"`);
        console.log(`  Entra desde tu móvil y escribe "hola"`);
        console.log(`═══════════════════════════════════════════\n`);
        expect(room.id).toBeTruthy();
        return;
      }

      // — observe —
      expect(existsSync(STATE_FILE)).toBe(true);
      const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as M2LiveState;

      const storage = new MemoryStorageAdapter();
      const encryption = new EncryptionService(storage);
      const auth = new AuthService(storage, encryption);
      const user = await auth.loginUser(state.fullUsername, PASSWORD);
      console.log(`[observe] sesión web restaurada: ${user.fullUsername}`);

      const roomSocket = new RoomSocket({ wsFactory });
      roomSocket.on('connected', () => console.log('[observe] sala conectada'));
      roomSocket.on('history', (h) =>
        console.log(`[observe:history] ${(h as { messages?: unknown[] }).messages?.length ?? 0} msgs`),
      );
      roomSocket.on('user_joined', (d) => console.log(`[observe:user_joined] ${JSON.stringify(d)}`));
      roomSocket.on('message', (m) =>
        console.log(
          `[observe:room <<] ${(m as { username?: string }).username ?? (m as { userId?: string }).userId}: ${(m as { content?: string }).content}`,
        ),
      );
      roomSocket.on('typing', (t) => console.log(`[observe:typing] ${JSON.stringify(t)}`));
      roomSocket.on('user_left', (d) => console.log(`[observe:user_left] ${JSON.stringify(d)}`));
      roomSocket.connect(state.roomId, user.fullUsername, user.userId, baseUrl);
      sockets.push(roomSocket);

      const dmSocket = new DirectMessageSocket({ wsFactory, encryption });
      dmSocket.on('connected', () => console.log('[observe] DM conectado'));
      dmSocket.on('message', (m) => console.log(`[observe:dm <<] ${JSON.stringify(m)}`));
      const peerKey = await ApiService.getPublicKey(state.peerUserId);
      await dmSocket.connect(
        state.conversationId,
        user.userId,
        user.fullUsername,
        state.peerUserId,
        baseUrl,
        peerKey ?? undefined,
      );
      sockets.push(dmSocket);

      console.log(`[observe] escuchando sala "${state.roomName}" ${Math.round(OBSERVE_MS / 1000)}s…`);
      await delay(OBSERVE_MS);
      console.log('[observe] fin.');
      expect(true).toBe(true);
    },
    OBSERVE_MS + 60_000,
  );
});
