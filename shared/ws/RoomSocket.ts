/**
 * Room WebSocket client — port of `src/services/ChatService.js`.
 *
 * Browser WebSocket, same event protocol as mobile:
 *   client → server: `join {username, userId}`, `message {id, content}`, `typing {isTyping}`
 *   server → client: `history`, `message`, `user_joined`, `user_left`, `user_list`, `typing`
 *
 * Deliberate differences from mobile (both are mobile bugs not to replicate):
 * - Uses the REGISTERED user id for the join payload (mobile generated an
 *   ephemeral `userId` per connection — WEB-ARCHITECTURE.md mobile bug #5).
 * - No NotificationService (web v1 has no push/local notifications).
 */

import { API_BASE_URL, roomWsPath, toWsUrl } from '../api/contracts';
import type { RoomMessage } from '../types';
import { EventEmitter } from './EventEmitter';
import { WS_OPEN, type WsFactory, type WsLike, browserWsFactory } from './WsTypes';

export interface RoomSocketEvents {
  history: { messages: RoomMessage[] };
  message: RoomMessage;
  user_joined: { username: string; totalUsers: number };
  user_left: { username?: string; totalUsers?: number };
  user_list: { users: string[]; totalUsers: number };
  typing: { username: string; isTyping: boolean };
  connected: { roomId: string };
  disconnected: { code: number; reason: string };
  error: { message?: string };
}

export const ROOM_RECONNECT = {
  maxAttempts: 5,
  backoffBaseMs: 2000,
} as const;

export class RoomSocket extends EventEmitter<RoomSocketEvents> {
  private ws: WsLike | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private username: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly wsFactory: WsFactory;

  constructor(options?: { wsFactory?: WsFactory; maxReconnectAttempts?: number }) {
    super();
    this.wsFactory = options?.wsFactory ?? browserWsFactory;
    this.maxReconnectAttempts = options?.maxReconnectAttempts ?? ROOM_RECONNECT.maxAttempts;
  }

  /**
   * Connect to a chat room.
   * @param roomId room id
   * @param username registered full username (name#disc)
   * @param userId registered user id (mobile bug #5 fix)
   * @param apiUrl base API url (http/https) used to derive the wss url
   */
  connect(roomId: string, username: string, userId: string, apiUrl = API_BASE_URL): void {
    this.roomId = roomId;
    this.username = username;
    this.userId = userId;

    const url = toWsUrl(apiUrl, roomWsPath(roomId));

    this.ws = this.wsFactory(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.send('join', {
        username: this.username!,
        userId: this.userId!,
      });
      this.emit('connected', { roomId: this.roomId! });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const type = String(data.type);
        this.emit(type as keyof RoomSocketEvents, data as never);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { message: (error as Error)?.message });
    };

    this.ws.onclose = (event) => {
      this.emit('disconnected', { code: event.code, reason: event.reason });

      if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
        this.reconnectAttempts++;
        const backoff = ROOM_RECONNECT.backoffBaseMs * this.reconnectAttempts;
        setTimeout(() => {
          if (this.ws === null) return; // explicitly disconnected meanwhile
          this.connect(roomId, username, userId, apiUrl);
        }, backoff);
      } else if (event.code !== 1000) {
        console.error('Max reconnection attempts reached');
        this.emit('error', { message: 'Could not connect to chat server' });
      }
    };
  }

  /**
   * Send a chat message.
   */
  sendMessage(content: string): void {
    if (!content || !content.trim()) return;
    this.send('message', {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      content: content.trim(),
    });
  }

  /**
   * Send typing indicator.
   */
  sendTypingIndicator(isTyping: boolean): void {
    this.send('typing', { isTyping });
  }

  /**
   * Send message to server.
   */
  send(type: string, data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WS_OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, ...data }));
      } catch (error) {
        console.error('Error sending message:', error);
        this.emit('error', { message: (error as Error)?.message });
      }
    } else {
      console.warn('WebSocket not connected, state:', this.ws?.readyState);
      this.emit('error', { message: 'Not connected to chat server' });
    }
  }

  /**
   * Disconnect from chat (no reconnect).
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WS_OPEN;
  }
}
