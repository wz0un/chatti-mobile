/**
 * RoomSocket tests — join payload, events, reconnect policy, disconnect.
 * Reconnect policy (spec): max 5 attempts, backoff 2s × attempt,
 * no reconnect on code 1000.
 */

import { RoomSocket } from './RoomSocket';
import { FakeWebSocket, fakeWsFactory } from './testUtils';

describe('RoomSocket', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const connectSocket = (roomId = 'room_1', username = 'alice#1234', userId = 'user_1', apiUrl = 'https://chatti-workers.wz0un.workers.dev') => {
    const socket = new RoomSocket({ wsFactory: fakeWsFactory });
    socket.connect(roomId, username, userId, apiUrl);
    const ws = FakeWebSocket.instances[0];
    return { socket, ws };
  };

  it('connects to the wss room endpoint and joins with the REGISTERED userId', () => {
    const { socket, ws } = connectSocket();
    expect(ws.url).toBe('wss://chatti-workers.wz0un.workers.dev/api/room/room_1');

    const connected = vi.fn();
    socket.on('connected', connected);
    ws.open();

    // Mobile bug #5 fix: the join must carry the registered userId, not an ephemeral one
    expect(ws.sent[0]).toEqual({ type: 'join', username: 'alice#1234', userId: 'user_1' });
    expect(connected).toHaveBeenCalledWith({ roomId: 'room_1' });
    expect(socket.isConnected()).toBe(true);
  });

  it('transforms http api urls into ws urls', () => {
    connectSocket('r1', 'a#1', 'u1', 'http://localhost:8787');
    expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:8787/api/room/r1');
  });

  it('emits server events with the same names as mobile', () => {
    const { socket, ws } = connectSocket();
    ws.open();

    const onMessage = vi.fn();
    const onTyping = vi.fn();
    const onJoined = vi.fn();
    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('user_joined', onJoined);

    ws.serverSend({ type: 'message', id: 'm1', username: 'bob#5678', content: 'hi', timestamp: 't' });
    ws.serverSend({ type: 'typing', username: 'bob#5678', isTyping: true });
    ws.serverSend({ type: 'user_joined', username: 'bob#5678', totalUsers: 2 });

    expect(onMessage).toHaveBeenCalledWith({ type: 'message', id: 'm1', username: 'bob#5678', content: 'hi', timestamp: 't' });
    expect(onTyping).toHaveBeenCalledWith({ type: 'typing', username: 'bob#5678', isTyping: true });
    expect(onJoined).toHaveBeenCalledWith({ type: 'user_joined', username: 'bob#5678', totalUsers: 2 });
  });

  it('sendMessage sends id + trimmed content', () => {
    const { socket, ws } = connectSocket();
    ws.open();
    socket.sendMessage('  hello  ');
    expect(ws.sent[1]).toMatchObject({ type: 'message', content: 'hello' });
    expect(ws.sent[1].id).toMatch(/^\d+-[a-z0-9]{9}$/);
  });

  it('sendMessage ignores empty content', () => {
    const { socket, ws } = connectSocket();
    ws.open();
    socket.sendMessage('   ');
    expect(ws.sent).toHaveLength(1);
  });

  it('sendTypingIndicator sends isTyping', () => {
    const { socket, ws } = connectSocket();
    ws.open();
    socket.sendTypingIndicator(true);
    expect(ws.sent[1]).toEqual({ type: 'typing', isTyping: true });
  });

  it('emits error when sending while disconnected', () => {
    const { socket } = connectSocket();
    const onError = vi.fn();
    socket.on('error', onError);
    socket.sendMessage('hello');
    expect(onError).toHaveBeenCalledWith({ message: 'Not connected to chat server' });
  });

  it('reconnects on unexpected close with 2s × attempt backoff and resets on open', () => {
    const { socket, ws } = connectSocket();
    ws.open();

    const disconnected = vi.fn();
    socket.on('disconnected', disconnected);
    ws.close(1006, 'abnormal');

    expect(disconnected).toHaveBeenCalledWith({ code: 1006, reason: 'abnormal' });
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    const ws2 = FakeWebSocket.instances[1];
    ws2.open();
    expect(ws2.sent[0]).toEqual({ type: 'join', username: 'alice#1234', userId: 'user_1' });
    // attempts reset after successful open
    ws2.close(1006, 'again');
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not reconnect on clean close (code 1000)', () => {
    const { ws } = connectSocket();
    ws.open();
    ws.close(1000, 'bye');
    vi.advanceTimersByTime(10000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('stops after max reconnect attempts and emits error', () => {
    const { socket } = connectSocket();
    let ws = FakeWebSocket.instances[0];
    ws.open();

    const onError = vi.fn();
    socket.on('error', onError);

    // 5 failed attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      ws.close(1006, 'x');
      vi.advanceTimersByTime(2000 * attempt);
      ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
      expect(ws.readyState).toBe(0);
    }

    // The 6th connection is the last attempt: its close emits the error
    ws.close(1006, 'x');
    expect(onError).toHaveBeenCalledWith({ message: 'Could not connect to chat server' });
  });

  it('disconnect closes the socket and clears listeners', () => {
    const { socket, ws } = connectSocket();
    ws.open();
    const onMessage = vi.fn();
    socket.on('message', onMessage);

    socket.disconnect();
    expect(ws.closed).toBe(true);
    ws.serverSend({ type: 'message', id: 'm1', username: 'b', content: 'c', timestamp: 't' });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('off removes a specific listener', () => {
    const { socket, ws } = connectSocket();
    ws.open();
    const listener = vi.fn();
    socket.on('message', listener);
    socket.off('message', listener);
    ws.serverSend({ type: 'message', id: 'm1', username: 'b', content: 'c', timestamp: 't' });
    expect(listener).not.toHaveBeenCalled();
  });
});
