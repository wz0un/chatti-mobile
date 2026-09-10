/**
 * Direct Message WebSocket client — port of `src/services/DirectMessageService.js`.
 *
 * Encrypted 1:1 chat over browser WebSocket, same event protocol as mobile:
 *   client → server: `join {userId, username, publicKey}`,
 *                    `encrypted_message {id, recipientId, encryptedContent, iv, senderPublicKey}`,
 *                    `typing {isTyping}`
 *   server → client: `history`, `encrypted_message`, `user_joined`, `user_left`,
 *                    `typing`, `key_exchanged`
 *
 * Mobile bug #1 fixed (WEB-ARCHITECTURE.md): the mobile `handleEncryptedMessage`
 * references `this.participants` (never initialized) and re-emits incoming DMs
 * as "could not decrypt" even on success. Here incoming messages are decrypted
 * and emitted directly — a correct web client is MORE functional than mobile,
 * which is acceptable per the CTO documentation.
 */

import { API_BASE_URL, dmWsPath, toWsUrl, ENDPOINTS } from '../api/contracts';
import {
  defaultEncryptionService,
  type EncryptionService,
} from '../crypto/EncryptionService';
import type { DecryptedMessage, DmEncryptedMessage } from '../types';
import { EventEmitter } from './EventEmitter';
import { WS_OPEN, type WsFactory, type WsLike, browserWsFactory } from './WsTypes';

export interface DirectMessageSocketEvents {
  history: { messages: DecryptedMessage[] };
  message: DecryptedMessage;
  user_joined: { userId: string; username?: string; publicKey?: string };
  user_left: { userId?: string; username?: string };
  typing: { username?: string; isTyping: boolean };
  key_exchanged: { userId: string; publicKey?: string };
  connected: { conversationId: string };
  disconnected: { code: number; reason: string };
  error: { message?: string };
}

export const DM_RECONNECT = {
  maxAttempts: 5,
  backoffBaseMs: 2000,
} as const;

export class DirectMessageSocket extends EventEmitter<DirectMessageSocketEvents> {
  private ws: WsLike | null = null;
  private conversationId: string | null = null;
  private userId: string | null = null;
  private username: string | null = null;
  private recipientId: string | null = null;
  private recipientPublicKey: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly wsFactory: WsFactory;
  private readonly encryption: EncryptionService;
  private isDisconnected = false;

  constructor(options?: {
    wsFactory?: WsFactory;
    maxReconnectAttempts?: number;
    encryption?: EncryptionService;
  }) {
    super();
    this.wsFactory = options?.wsFactory ?? browserWsFactory;
    this.maxReconnectAttempts = options?.maxReconnectAttempts ?? DM_RECONNECT.maxAttempts;
    this.encryption = options?.encryption ?? defaultEncryptionService;
  }

  /**
   * Connect to a direct message conversation.
   * @param recipientPublicKey optional pre-fetched key; fetched via REST when omitted
   */
  async connect(
    conversationId: string,
    userId: string,
    username: string,
    recipientId: string,
    apiUrl = API_BASE_URL,
    recipientPublicKey: string | null = null,
  ): Promise<void> {
    // Close any existing socket WITHOUT clearing event listeners.
    // Listeners survive reconnection; only explicit disconnect()/destroy()
    // wipes them.  (BUG-02 fix)
    // NOTE: reconnectAttempts is NOT reset here — it accumulates across
    // reconnect attempts and only resets in onopen() on successful connect.
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isDisconnected = false;

    this.conversationId = conversationId;
    this.userId = userId;
    this.username = username;
    this.recipientId = recipientId;

    try {
      await this.encryption.initialize();
      if (this.isDisconnected) return;

      const publicKey = await this.encryption.getPublicKey();
      if (this.isDisconnected) return;

      const url = toWsUrl(apiUrl, dmWsPath(conversationId));

      if (recipientPublicKey) {
        this.recipientPublicKey = recipientPublicKey;
      }

      if (!this.recipientPublicKey) {
        this.recipientPublicKey = await this.fetchPublicKey(apiUrl, recipientId);
      }

      if (this.isDisconnected) return;

      this.ws = this.wsFactory(url);

      this.ws.onopen = async () => {
        if (this.isDisconnected) {
          this.ws!.close();
          return;
        }
        this.reconnectAttempts = 0;

        this.send('join', {
          userId: this.userId!,
          username: this.username!,
          publicKey,
        });

        this.emit('connected', { conversationId: this.conversationId! });
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          await this.handleIncomingMessage(data as never);
        } catch (error) {
          console.error('Error parsing DM:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('DM WebSocket error:', error);
        this.emit('error', { message: (error as Error)?.message });
      };

      this.ws.onclose = (event) => {
        if (this.isDisconnected) return; // Ignore expected close

        this.emit('disconnected', { code: event.code, reason: event.reason });

        if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
          this.reconnectAttempts++;
          const backoff = DM_RECONNECT.backoffBaseMs * this.reconnectAttempts;
          setTimeout(async () => {
            if (this.isDisconnected) return;
            await this.connect(
              conversationId,
              userId,
              username,
              recipientId,
              apiUrl,
              this.recipientPublicKey,
            );
          }, backoff);
        } else if (event.code !== 1000) {
          console.error('Max DM reconnection attempts reached');
          this.emit('error', { message: 'Could not connect to encrypted chat server' });
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.emit('error', { message: (error as Error)?.message });
    }
  }

  /**
   * Disconnect from conversation and clear all event listeners.
   * Use this for intentional teardown (page unmount, logout).
   * For reconnection, `connect()` handles socket replacement without
   * touching listeners.
   */
  disconnect(): void {
    this.isDisconnected = true;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.clear();
    this.recipientPublicKey = null;
  }

  /**
   * Handle incoming messages (same dispatch as mobile).
   */
  async handleIncomingMessage(data: { type?: string } & Record<string, unknown>): Promise<void> {
    switch (data.type) {
      case 'history':
        await this.handleHistory((data.messages ?? []) as DmEncryptedMessage[]);
        break;
      case 'encrypted_message':
        await this.handleEncryptedMessage(data as unknown as DmEncryptedMessage);
        break;
      case 'user_joined':
        this.handleUserJoined(data as { userId: string; publicKey?: string });
        break;
      case 'user_left':
        this.emit('user_left', data as { userId?: string; username?: string });
        break;
      case 'typing':
        this.emit('typing', data as { username?: string; isTyping: boolean });
        break;
      case 'key_exchanged':
        this.handleKeyExchanged(data as { userId: string; publicKey?: string });
        break;
      default:
        console.log('Unknown DM type:', data.type);
    }
  }

  /**
   * Handle message history (decrypt all).
   */
  async handleHistory(messages: DmEncryptedMessage[]): Promise<void> {
    const decryptedMessages: DecryptedMessage[] = [];

    for (const msg of messages) {
      try {
        const decrypted = await this.decryptIncomingMessage(msg);
        if (decrypted) {
          decryptedMessages.push(decrypted);
        }
      } catch (error) {
        console.error('Error decrypting history message:', error);
        decryptedMessages.push({
          id: msg.id,
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          content: '[Encrypted Message]',
          timestamp: msg.timestamp ?? new Date().toISOString(),
          isEncrypted: true,
        });
      }
    }

    this.emit('history', { messages: decryptedMessages });
  }

  /**
   * Handle a single encrypted message — mobile bug #1 fixed:
   * the message is decrypted and emitted directly (no `participants` lookup).
   */
  async handleEncryptedMessage(data: DmEncryptedMessage): Promise<void> {
    try {
      const decrypted = await this.decryptIncomingMessage(data);
      if (decrypted) {
        this.emit('message', decrypted);
      }
    } catch (error) {
      console.error('Error handling encrypted message:', error);
      this.emit('message', {
        id: data.id,
        senderId: data.senderId,
        recipientId: data.recipientId,
        content: '[Encrypted Message - Could not decrypt]',
        timestamp: data.timestamp ?? new Date().toISOString(),
        isEncrypted: true,
      });
    }
  }

  /**
   * Decrypt incoming message (same derivation rules as mobile).
   */
  async decryptIncomingMessage(encryptedMsg: DmEncryptedMessage): Promise<DecryptedMessage | null> {
    const { encryptedContent, iv, senderId, senderPublicKey } = encryptedMsg;

    if (senderId === this.recipientId && senderPublicKey) {
      this.recipientPublicKey = senderPublicKey;
    }

    // If I am the sender, use the recipient's key/ID; otherwise the sender's.
    const isMe = senderId === this.userId;
    const targetUserId = isMe ? this.recipientId! : senderId;
    const targetPublicKey = isMe ? this.recipientPublicKey : senderPublicKey || this.recipientPublicKey;

    if (!targetPublicKey) {
      console.warn('No public key available for decryption');
      return null;
    }

    const sharedSecret = await this.encryption.deriveSharedSecret(
      targetUserId,
      targetPublicKey,
    );

    const decryptedContent = await this.encryption.decryptMessage(
      encryptedContent,
      iv,
      sharedSecret,
    );

    return {
      id: encryptedMsg.id,
      senderId,
      recipientId: encryptedMsg.recipientId,
      content: decryptedContent,
      timestamp: encryptedMsg.timestamp ?? new Date().toISOString(),
      isEncrypted: false,
    };
  }

  /**
   * Handle user joined.
   */
  handleUserJoined(data: { userId: string; publicKey?: string }): void {
    if (data.userId === this.recipientId && data.publicKey) {
      this.recipientPublicKey = data.publicKey;
    }
    this.emit('user_joined', data);
  }

  /**
   * Handle key exchange.
   */
  handleKeyExchanged(data: { userId: string; publicKey?: string }): void {
    if (data.userId === this.recipientId && data.publicKey) {
      this.recipientPublicKey = data.publicKey;
    }
    this.emit('key_exchanged', data);
  }

  /**
   * Fetch recipient's public key from the server.
   */
  async fetchPublicKey(apiUrl: string, userId: string): Promise<string | null> {
    try {
      const baseUrl = apiUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      const params = new URLSearchParams({ userId });
      const response = await fetch(`${baseUrl}${ENDPOINTS.usersPublicKey}?${params.toString()}`);

      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          publicKey?: string;
        };
        if (data.success && data.publicKey) {
          return data.publicKey;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching public key:', error);
      return null;
    }
  }

  /**
   * Send encrypted message.
   */
  async sendMessage(content: string): Promise<void> {
    if (!content || !content.trim()) return;

    try {
      if (!this.recipientPublicKey) {
        console.warn('No recipient public key - cannot encrypt message');
        this.emit('error', {
          message: 'Recipient not available for encryption. They may need to come online once.',
        });
        return;
      }

      const sharedSecret = await this.encryption.deriveSharedSecret(
        this.recipientId!,
        this.recipientPublicKey,
      );

      const { encryptedContent, iv } = await this.encryption.encryptMessage(
        content.trim(),
        sharedSecret,
      );

      const publicKey = await this.encryption.getPublicKey();

      this.send('encrypted_message', {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        recipientId: this.recipientId!,
        encryptedContent,
        iv,
        senderPublicKey: publicKey,
      });
    } catch (error) {
      console.error('Error sending encrypted message:', error);
      this.emit('error', { message: (error as Error)?.message });
    }
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
        console.error('Error sending DM message:', error);
        this.emit('error', { message: (error as Error)?.message });
      }
    } else {
      console.warn('DM WebSocket not connected, state:', this.ws?.readyState);
      this.emit('error', { message: 'Not connected to encrypted chat server' });
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WS_OPEN;
  }
}
