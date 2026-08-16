/**
 * Fake WebSocket for socket-client tests — simulates the browser WebSocket
 * surface and lets tests drive server → client events.
 */

import type { WsCloseEvent, WsLike, WsMessageEvent } from './WsTypes';

export class FakeWebSocket implements WsLike {
  static instances: FakeWebSocket[] = [];

  readyState: number = 0; // CONNECTING
  sent: { type: string; [key: string]: unknown }[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: WsMessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: WsCloseEvent) => void) | null = null;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as { type: string; [key: string]: unknown });
  }

  close(code = 1000, reason = ''): void {
    this.closed = true;
    this.readyState = 3; // CLOSED
    this.onclose?.({ code, reason });
  }

  open(): void {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  fail(): void {
    this.onerror?.({ message: 'fake network error' });
  }

  /** Server → client frame. Resolves when the (possibly async) handler completes. */
  serverSend(data: Record<string, unknown>): Promise<void> {
    const handler = this.onmessage;
    if (!handler) return Promise.resolve();
    return Promise.resolve(
      handler({ data: JSON.stringify(data) }) as unknown,
    ).then(() => undefined);
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }
}

export const fakeWsFactory = (url: string): FakeWebSocket => new FakeWebSocket(url);
