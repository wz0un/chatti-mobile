/**
 * QA regression probe — BUG-01 (backend auth 503 / error code 1102).
 *
 * REPRODUCES the original QA procedure from docs/QA-REPORT.md §5 & BUG-01:
 *   1. POST /api/auth/register with a valid payload, repeated 10–15 times
 *      over a few minutes.
 *   2. POST /api/auth/login per account.
 *   3. Assert consistent 200s — any 5xx/1102 fails the probe.
 *
 * Also re-checks the documented GET stability ("GET endpoints never failed")
 * and records per-request latency (1102 is often preceded by slow responses).
 *
 * Never part of the default unit suite — run explicitly:
 *   npm run qa:bug01            (1 round = 12 register+login pairs)
 *   npm run qa:bug01 -- stress  (3 rounds, spaced, to catch intermittency)
 *
 * Creates only throwaway accounts with unique usernames and deletes them
 * best-effort. NEVER use real credentials.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AuthService } from '../../shared/auth/AuthService';
import { ApiService } from '../../shared/api/ApiService';
import { EncryptionService } from '../../shared/crypto/EncryptionService';
import { MemoryStorageAdapter } from '../../shared/storage/StorageAdapter';

const baseUrl = (
  process.env.VITE_API_URL ?? 'https://chatti-workers.wz0un.workers.dev'
).replace(/\/+$/, '');

const reportDir = join(tmpdir(), 'chatti-qa');
const reportPath = join(reportDir, `bug01-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const PASSWORD = 'bug01-qa-pass-123';
const ROUNDS = process.env.BUG01_STRESS === '1' ? 3 : 1;
const PER_ROUND = process.env.BUG01_PER_ROUND || '12';
const ROUND_DELAY_MS = Number(process.env.BUG01_DELAY_MS || 10000);

type Attempt = { op: string; ok: boolean; status: number; latencyMs: number };
const failures: Attempt[] = [];

function formatStatus(err: unknown): { status: number; detail: string } {
  const message = err instanceof Error ? err.message : String(err);
  const m = message.match(/status: (\d{3})/);
  return { status: m ? Number(m[1]) : 0, detail: message };
}

async function runRound(round: number): Promise<Attempt[]> {
  const attempts: Attempt[] = [];
  for (let i = 0; i < Number(PER_ROUND); i++) {
    const username = `bug01qa_r${round}_${i}_${Date.now().toString(36)}`.slice(0, 24);
    const storage = new MemoryStorageAdapter();
    const encryption = new EncryptionService(storage);
    const auth = new AuthService(storage, encryption);

    // register
    const t0 = Date.now();
    try {
      const user = await auth.registerUser(username, PASSWORD);
      attempts.push({
        op: 'register',
        ok: true,
        status: 200,
        latencyMs: Date.now() - t0,
      });

      // login right after
      const t1 = Date.now();
      try {
        const login = await auth.loginUser(user.fullUsername, PASSWORD);
        attempts.push({
          op: 'login',
          ok: login.userId === user.userId,
          status: login.userId === user.userId ? 200 : 0,
          latencyMs: Date.now() - t1,
        });
      } catch (err) {
        const { status, detail } = formatStatus(err);
        attempts.push({ op: 'login', ok: false, status, latencyMs: Date.now() - t1 });
        failures.push({ op: 'login', ok: false, status, latencyMs: Date.now() - t1 });
        console.error(`  ✗ login ${username}: ${detail}`);
      }

      // GET read-only stability check (documented: GET never failed)
      const t2 = Date.now();
      try {
        const conversations = await ApiService.getUserConversations(user.userId);
        attempts.push({
          op: 'get-conversations',
          ok: Array.isArray(conversations),
          status: Array.isArray(conversations) ? 200 : 0,
          latencyMs: Date.now() - t2,
        });
      } catch (err) {
        const { status, detail } = formatStatus(err);
        attempts.push({ op: 'get-conversations', ok: false, status, latencyMs: Date.now() - t2 });
        failures.push({ op: 'get-conversations', ok: false, status, latencyMs: Date.now() - t2 });
        console.error(`  ✗ get-conversations ${username}: ${detail}`);
      }

      // cleanup — best effort
      try {
        await ApiService.deleteAccount(user.userId, user.deviceId);
      } catch {
        console.warn(`  ⚠ cleanup failed for ${user.userId}`);
      }
    } catch (err) {
      const { status, detail } = formatStatus(err);
      attempts.push({ op: 'register', ok: false, status, latencyMs: Date.now() - t0 });
      failures.push({ op: 'register', ok: false, status, latencyMs: Date.now() - t0 });
      console.error(`  ✗ register ${username}: ${detail}`);
    }
  }
  return attempts;
}

describe('BUG-01: backend auth stability (register/login repeated)', () => {
  beforeAll(() => {
    ApiService.configure(baseUrl);
    console.log(
      `bug01 probe: ${ROUNDS} round(s) × ${PER_ROUND} register+login pairs @ ${baseUrl}`,
    );
  });

  it(`${ROUNDS} round(s) × ${PER_ROUND}: every attempt returns 200`, async () => {
    const allRounds: { round: number; attempts: Attempt[] }[] = [];
    for (let r = 1; r <= ROUNDS; r++) {
      console.log(`\n— round ${r}/${ROUNDS} —`);
      const attempts = await runRound(r);
      allRounds.push({ round: r, attempts });
      const okCount = attempts.filter((a) => a.ok).length;
      const latencies = attempts.map((a) => a.latencyMs).sort((x, y) => x - y);
      const p95 = latencies[Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1)];
      console.log(
        `  round ${r}: ${okCount}/${attempts.length} ok · max ${Math.max(...latencies)}ms · ` +
          `avg ${Math.round(latencies.reduce((s, a) => s + a, 0) / Math.max(attempts.length, 1))}ms · p95 ${p95}ms`,
      );
      if (r < ROUNDS) {
        console.log(`  waiting ${ROUND_DELAY_MS}ms before next round…`);
        await new Promise((resolve) => setTimeout(resolve, ROUND_DELAY_MS));
      }
    }

    try {
      mkdirSync(reportDir, { recursive: true });
      writeFileSync(
        reportPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            baseUrl,
            rounds: allRounds,
            failures,
            verdict: failures.length === 0 ? 'PASS — BUG-01 not reproduced' : 'FAIL — BUG-01 reproduced',
          },
          null,
          2,
        ),
      );
      console.log(`  report: ${reportPath}`);
    } catch (err) {
      console.warn(`  could not write report: ${(err as Error).message}`);
    }

    if (failures.length > 0) {
      const lines = failures
        .map((f) => `  ${f.op} → status ${f.status || 'n/a'} (${f.latencyMs}ms)`)
        .join('\n');
      throw new Error(`BUG-01 reproduced: ${failures.length} failed attempt(s):\n${lines}`);
    }
    expect(failures).toHaveLength(0);
  }, 30 * 60 * 1000);

  afterAll(() => {
    console.log(
      failures.length === 0
        ? '\n✅ BUG-01 NOT reproduced — auth stable across probe.'
        : `\n❌ BUG-01 REPRODUCED — ${failures.length} failed auth attempt(s).`,
    );
  });
});