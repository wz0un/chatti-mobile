# Deep Technical Audit — Backend

## 1) Architecture Overview

### Topology
- **Primary backend runtime:** Cloudflare Worker + Durable Objects + KV.
- **Secondary backend runtime (legacy/parallel):** Node.js + Socket.IO server in `server/` (separate stack, not integrated with Worker path).
- **Frontend:** React SPA (CRA-style) + service worker.

### Architectural style
- Not microservices.
- Not clean monolith either.
- It is a **hybrid edge monolith with stateful shards** (Durable Objects) plus a **stranded legacy realtime server**.

### Key components
- **Worker router/API:** auth, contacts, DM/session discovery, room CRUD.
- **Durable Object `ChatRoom`:** realtime room broadcast, no persistent history in current mode.
- **Durable Object `DirectMessage`:** 1:1 encrypted payload relay; offline pending queue only.
- **KV namespace (`ROOMS_KV`):** users, contacts, room metadata, DM conversation indexes, transient online markers.
- **Frontend services:**
  - `ChatService` for room websocket.
  - `DirectMessageService` for DM websocket + client-side decrypt.
  - `EncryptionService` for key exchange/encryption logic.

### Data flow (DM send/receive)
1. Sender opens websocket to `/api/dm/:conversationId`.
2. Sender sends `join` with `{userId, username, publicKey}`.
3. Sender encrypts payload locally and sends `encrypted_message` with message id.
4. Durable Object relays to connected sockets (`broadcast`) and, if recipient offline, stores in `pending_messages` SQLite table.
5. Recipient reconnects and sends `join`.
6. DO reads all pending rows for recipient, sends each message over websocket, then deletes rows.

## 2) Messaging Reliability (CRITICAL)

## What currently works
- Per-message IDs exist and are client-provided or randomly generated server-side fallback.
- Basic dedup is present in DM path via `pending_messages.id` primary key + client-side `messageIds` set.
- Offline recipient queue exists for DMs only (ephemeral queue, not durable history).
- Deterministic conversation ID generation prevents duplicate threads for same pair in normal case.

## What is missing / broken
- **No authoritative delivery ACK protocol** (sent/delivered/read states do not exist server-side).
- **No idempotent send contract** exposed at API level (no explicit idempotency key semantics, no retriable send API).
- **No replay-safe reconnect semantics** for room chat (history endpoint always empty in ephemeral mode).
- **Ordering guarantees are weak**:
  - In-memory websocket broadcast order is incidental, not contractual.
  - Offline queue ordered by timestamp, but timestamp is wall-clock and unsynchronized.
- **Dedup is partial and volatile**:
  - Client dedup set is RAM-only and reset on app reload.
  - `INSERT OR REPLACE` can overwrite prior payload with same ID silently.
- **Failure behavior under disconnect will lose UX state**:
  - DM/room caches are RAM-only; app restart means message list loss.
  - Room messages are never persisted in current mode.
- **No sender-side outbox with retry+backoff+jitter tied to ACK.**

## What will break in production
- Under bad networks, users will see ambiguous send outcomes (“sent?”) because there is no server ACK state machine.
- Duplicate sends will happen from client retries; dedup is insufficient for cross-session or cross-device consistency.
- Room chat history is effectively nonexistent after reconnect/reload: unacceptable for messaging product expectations.
- Conversation ordering/read consistency across multiple devices is undefined.
- At scale, support incidents will spike due to ghost messages, missing history, and irreproducible ordering bugs.

## 3) Offline-First & Sync (Mobile)

- **Offline outbox:** not implemented.
- **Sync model:** mostly “live socket stream + ephemeral cache”, not cursor-based durable sync.
- **Conflict resolution:** none (no vector clocks/LWW policies/versioning).
- **Reconnection:** limited websocket reconnect attempts (max 5) with linear-backoff-like delay multiplier.
- **Background sync:** placeholder function exists in service worker but no actual message sync logic.

Verdict: **not offline-first**. It is online-first with minimal reconnect behavior.

## 4) Backend Robustness

- **Stateless vs stateful:**
  - Worker endpoints are stateless request handlers.
  - Durable Objects are stateful single-threaded actors per conversation/room key.
- **Queue middleware:** no Kafka/Rabbit/SQS equivalent.
- **Idempotency:** ad-hoc only (DM pending table PK), not end-to-end protocol-level.
- **Horizontal scalability:**
  - DO model can scale by key partitioning, but hot rooms/conversations become single-actor bottlenecks.
  - KV list scans (`prefix` based) will become expensive and eventually inconsistent for large cardinalities.
- **Bottlenecks:**
  - KV as primary relational store surrogate.
  - `contact` and `conversation` fanout via key scans and multiple puts.
  - No observability SLO plumbing for message latency/loss.

## 5) Security & Privacy

- **Authentication/session security:**
  - No JWT/session token enforcement on API routes.
  - Any caller can invoke critical endpoints with userId values.
- **Transport/at-rest controls:**
  - CORS allows `*` at Worker layer for all origins.
  - Sensitive user metadata (including password hash, public key, push tokens) is in KV documents.
- **E2EE claim quality:**
  - Client uses custom DH + XOR stream style scheme, not audited modern AEAD protocol.
  - No authenticated encryption (e.g., AES-GCM/ChaCha20-Poly1305), no signature/authentication on key exchange.
  - Vulnerable to MITM/key-substitution because server-distributed public keys are not verified by trust model.
- **GDPR concerns:**
  - No visible data retention policy enforcement for metadata.
  - No DSAR tooling/process code paths beyond account delete basics.
  - No audit trail for consent, processing purpose, or data export.

## 6) Code Quality & Risks

- **Architectural split-brain:** Worker stack and legacy Socket.IO stack (`server/`) coexist; unclear source of truth.
- **Ephemeral mode comments contradict product direction** (WhatsApp-like requires durable sync).
- **Potential bug:** conversation sorting uses `createdAt` but conversation objects set `lastMessageTime`.
- **Tests are stale vs implementation:** test expects `totalMessages` and non-empty history while implementation is ephemeral empty history.
- **Error handling:** broad try/catch logs exist, but no typed error taxonomy, no retry classification, no circuit breaking.
- **Abstractions:** messaging protocol is implicit JSON events, no shared schema/versioning contract.

## 7) Production Readiness Score (1-10)

- **Reliability:** **2/10**
- **Scalability:** **4/10**
- **Security:** **2/10**
- **Mobile robustness / offline:** **1/10**

## 8) Prioritized Action Plan

## P0 (must fix before launch)
1. **Implement authenticated sessions everywhere**
   - Add JWT (short-lived access + refresh rotation) or opaque session tokens.
   - Enforce auth middleware on all `/api/*` mutating/read-sensitive endpoints.
2. **Define a real message state machine**
   - `client_msg_id` (UUIDv7) + server `message_id`.
   - States: queued, accepted, delivered, read.
   - Server ACK events with monotonic sequence per conversation.
3. **Add idempotent message ingest**
   - Durable storage table with unique `(conversation_id, client_msg_id)`.
   - Duplicate ingest returns prior canonical message record.
4. **Replace custom XOR crypto path**
   - Use audited protocol primitives (Signal/X3DH + Double Ratchet; at minimum AEAD with authenticated key exchange).
5. **Persist message history durably**
   - Stop dropping message tables in initialization.
   - Add retention controls and encrypted-at-rest strategy.
6. **Prevent unauthorized key substitution**
   - Signed identity keys + safety number verification flow.

## P1 (important; can wait قلي)
1. **Offline outbox on client**
   - IndexedDB queue with retry policy and dedup by `client_msg_id`.
2. **Cursor-based incremental sync**
   - Per-conversation `last_seq` cursor; server endpoint `GET /messages?after_seq=`.
3. **Delivery reconciliation on reconnect**
   - Client sends last acknowledged sequence; server retransmits gaps.
4. **Observability**
   - Emit metrics: ingest latency, queue depth, ack lag, reconnect success rate, dedup hit rate.
5. **Fix data model mismatches/tests**
   - Align conversation sort fields and update broken tests.

## P2 (future improvements)
1. **Multi-device consistency model**
   - Device sessions, per-device key bundles, and read-state fanout.
2. **Backpressure and rate-limits**
   - Per-user and per-conversation quotas + abuse controls.
3. **Regional data governance controls**
   - EU data residency boundaries, DPA-ready logging, retention automation.
4. **Protocol versioning**
   - Versioned event envelope and migration compatibility matrix.

## Bottom line
As-is, this is a prototype realtime chat demo, not a production-grade secure messenger. Launching to millions under poor network conditions would fail on reliability, security, and offline behavior.
