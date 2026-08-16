/**
 * Minimal WebSocket surface used by the socket clients.
 * Browser `WebSocket` satisfies this; tests inject a fake.
 */

export interface WsCloseEvent {
  code: number;
  reason: string;
}

export interface WsMessageEvent {
  data: string;
}

export interface WsLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: WsMessageEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: WsCloseEvent) => void) | null;
}

export type WsFactory = (url: string) => WsLike;

export const WS_OPEN = 1;

/** Browser WebSocket factory (default). */
export const browserWsFactory: WsFactory = (url: string) => new WebSocket(url) as unknown as WsLike;
