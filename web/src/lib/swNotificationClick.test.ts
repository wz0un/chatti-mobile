/* eslint-disable */
import swSource from '../../public/sw.js?raw';
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeClient(url: string, opts: { controlled?: boolean; navigateThrows?: boolean } = {}) {
  return {
    url,
    focus: vi.fn(async () => {}),
    navigate: opts.controlled === false ? undefined : vi.fn(async () => {
      if (opts.navigateThrows) throw new Error('navigate failed');
    }),
  };
}

function loadSw(clients: any[]) {
  const listeners: Record<string, (e: any) => void> = {};
  const openWindow = vi.fn(async (_url: string) => {});
  const selfObj: any = {
    skipWaiting: vi.fn(),
    clients: { matchAll: vi.fn(async () => clients), openWindow },
    registration: { scope: 'https://example.com/' },
    addEventListener: (type: string, cb: any) => { listeners[type] = cb; },
  };
  (globalThis as any).self = selfObj;
  eval(swSource);
  return { selfObj, listeners, openWindow };
}

describe('sw notificationclick', () => {
  beforeEach(() => {
    (globalThis as any).self = undefined;
  });

  it('opens a new window when none is open', async () => {
    const { listeners, openWindow } = loadSw([]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(openWindow).toHaveBeenCalledWith('https://example.com/room/r1');
  });

  it('focuses + navigates an open app window on another route (controlled)', async () => {
    const client = makeClient('https://example.com/rooms', { controlled: true });
    const { listeners } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).toHaveBeenCalledWith('https://example.com/room/r1');
  });

  it('falls back to openWindow when an uncontrolled client has no navigate()', async () => {
    const client = makeClient('https://example.com/rooms', { controlled: false });
    const { listeners, openWindow } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.focus).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith('https://example.com/room/r1');
  });

  it('falls back to openWindow when navigate() rejects', async () => {
    const client = makeClient('https://example.com/rooms', { controlled: true, navigateThrows: true });
    const { listeners, openWindow } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.focus).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith('https://example.com/room/r1');
  });

  it('focuses without navigating when already on target (trailing slash)', async () => {
    const client = makeClient('https://example.com/room/r1/', { controlled: true });
    const { listeners } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).not.toHaveBeenCalled();
  });

  it('focuses without navigating when already on target (query diff)', async () => {
    const client = makeClient('https://example.com/room/r1?x=1', { controlled: true });
    const { listeners } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).not.toHaveBeenCalled();
  });

  it('skips clients with unparseable urls', async () => {
    const bad = makeClient('not a url', { controlled: true });
    const good = makeClient('https://example.com/rooms', { controlled: true });
    const { listeners, openWindow } = loadSw([bad, good]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(good.focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('continues when focus() rejects', async () => {
    const client = makeClient('https://example.com/rooms', { controlled: true });
    client.focus.mockRejectedValue(new Error('focus failed'));
    const { listeners } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.navigate).toHaveBeenCalledWith('https://example.com/room/r1');
  });
  it('falls through when already-on-target focus() rejects', async () => {
    const client = makeClient('https://example.com/room/r1', { controlled: true });
    client.focus.mockRejectedValue(new Error('focus failed'));
    const { listeners } = loadSw([client]);
    let pending: any;
    const event: any = { notification: { close: vi.fn(), data: { url: '/room/r1' } }, waitUntil: (p: any) => { pending = p; } };
    listeners.notificationclick(event);
    await pending;
    expect(client.navigate).toHaveBeenCalledWith('https://example.com/room/r1');
  });

});
