/**
 * Platform-neutral domain types for Chatti.
 * Single source of truth shared by the web app (and, in Phase 2, mobile).
 * Spec: docs/WEB-ARCHITECTURE.md §6.
 */

export interface User {
  userId: string;
  username: string;
  discriminator: string;
  fullUsername: string;
  deviceId: string;
  publicKey: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface RoomMessage {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  createdAt: string;
  totalUsers?: number;
}

export interface ConversationLastMessage {
  content?: string;
  timestamp?: string;
}

export interface Conversation {
  conversationId: string;
  id?: string;
  participants?: string[];
  recipient?: User;
  recipientId?: string;
  recipientUsername?: string;
  lastMessage?: ConversationLastMessage | string;
  lastMessageTime?: string;
  createdAt: string;
}

/** Normalized conversation used by the web conversations list (dedupe + sort output). */
export interface NormalizedConversation extends Conversation {
  normalizedRecipientId: string;
  recipientUsername: string;
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  isEncrypted: boolean;
}

export interface ContactRequest {
  requestId: string;
  senderId: string;
  senderUsername: string;
  createdAt: string;
}

export interface Contact {
  userId: string;
  username: string;
  fullUsername: string;
  deviceId: string;
  conversationId?: string;
  publicKey?: string;
  createdAt?: string;
}

export interface RoomWsEvents {
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

export interface DmWsEvents {
  history: { messages: DmEncryptedMessage[] };
  message: DecryptedMessage;
  encrypted_message: DmEncryptedMessage;
  user_joined: { userId: string; username?: string; publicKey?: string };
  user_left: { userId?: string; username?: string };
  typing: { username?: string; isTyping: boolean };
  key_exchanged: { userId: string; publicKey?: string };
  connected: { conversationId: string };
  disconnected: { code: number; reason: string };
  error: { message?: string };
}

export interface DmEncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  iv: string;
  senderPublicKey?: string;
  timestamp?: string;
}

/** WS event union (as received over the wire). */
export type WsEvent =
  | { type: 'history'; messages: RoomMessage[] }
  | { type: 'message'; id: string; username: string; content: string; timestamp: string }
  | { type: 'user_joined'; username: string; totalUsers: number }
  | { type: 'user_left'; username?: string; totalUsers?: number }
  | { type: 'user_list'; users: string[]; totalUsers: number }
  | { type: 'typing'; username?: string; isTyping: boolean }
  | { type: 'key_exchanged'; userId: string; publicKey?: string }
  | { type: 'encrypted_message'; [key: string]: unknown };
