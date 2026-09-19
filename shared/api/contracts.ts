/**
 * API contracts — single source of truth for endpoint paths, payloads and
 * response shapes. Mirror of the mobile `src/services/ApiService.js` contract.
 * Spec: docs/WEB-ARCHITECTURE.md §3 (verified live against the Cloudflare Worker).
 */

import type { Contact, ContactRequest, Conversation, Room, RoomMessage, User } from '../types';

export const API_BASE_URL = 'https://chatti-workers.wz0un.workers.dev';

export const ENDPOINTS = {
  rooms: '/api/rooms',
  roomCreate: '/api/room/create',
  roomInfo: (roomId: string) => `/api/room/${roomId}/info`,
  roomMessages: (roomId: string) => `/api/room/${roomId}/messages`,
  roomPost: (roomId: string) => `/api/room/${roomId}/post`,
  authRegister: '/api/auth/register',
  authLogin: '/api/auth/login',
  authUpdatePushToken: '/api/auth/update-push-token',
  authWebPush: '/api/auth/webpush',
  authDelete: '/api/auth/delete',
  usersFind: '/api/users/find',
  usersByDeviceId: '/api/users/by-device-id',
  usersPublicKey: '/api/users/public-key',
  dmStart: '/api/dm/start',
  dmConversations: '/api/dm/conversations',
  dmDelete: '/api/dm/delete',
  contactsRequest: '/api/contacts/request',
  contactsRequests: '/api/contacts/requests',
  contactsAccept: '/api/contacts/accept',
  contactsReject: '/api/contacts/reject',
  contactsList: '/api/contacts/list',
} as const;

/** WS endpoint for a room: `wss://host/api/room/{roomId}` */
export const roomWsPath = (roomId: string) => `/api/room/${roomId}`;
/** WS endpoint for a DM: `wss://host/api/dm/{conversationId}` */
export const dmWsPath = (conversationId: string) => `/api/dm/${conversationId}`;

/** Transform an http(s) base URL into its ws(s) equivalent (same host/path). */
export const toWsUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace('http://', 'ws://').replace('https://', 'wss://')}${path}`;

// --- Auth ---

export interface RegisterPayload {
  username: string;
  password: string;
  deviceId: string;
  expoPushToken: string | null;
  publicKey: string;
}

export interface LoginPayload {
  fullUsername: string;
  password: string;
  expoPushToken: string | null;
  publicKey: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// --- Web Push ---

/**
 * Serialized form of a Web Push `PushSubscription` as produced by
 * `PushSubscription.toJSON()` (endpoint + optional keys). Sent to the
 * backend when registering a browser for push. Contract: docs/WEB-PUSH.md.
 */
export interface WebPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type WebPushAction = 'register' | 'remove';

export type WebPushRegisterPayload = {
  userId: string;
  deviceId: string;
  action: 'register';
  subscription: WebPushSubscription;
};

export type WebPushRemovePayload = {
  userId: string;
  deviceId: string;
  action: 'remove';
  /** Exact subscription endpoint previously registered (identifies the device on the backend). */
  endpoint: string;
};

export type WebPushPayload = WebPushRegisterPayload | WebPushRemovePayload;

export interface WebPushResponse {
  success: boolean;
  error?: string;
}

// --- Rooms ---

export interface RoomsResponse {
  rooms: Room[];
  cursor: string | null;
  hasMore: boolean;
}

export interface RoomMessagesResponse {
  messages: RoomMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateRoomPayload {
  name: string;
  owner: string;
  isPrivate: boolean;
  password: string | null;
}

// --- Direct messages ---

export interface StartDmResponse {
  success: boolean;
  conversationId?: string;
  url?: string;
  error?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

export interface DeleteDmPayload {
  userId: string;
  conversationId: string;
}

// --- Users ---

export interface PublicKeyResponse {
  success: boolean;
  publicKey?: string;
  error?: string;
}

// --- Contacts ---

export interface ContactRequestPayload {
  senderId: string;
  recipientDeviceId: string;
  senderUsername: string;
}

export interface ContactRequestActionPayload {
  requestId: string;
  userId: string;
}

export interface ContactsListResponse {
  contacts: Contact[];
  total: number;
}

export interface ContactRequestsResponse {
  requests: ContactRequest[];
  total: number;
}

// --- Account ---

export interface DeleteAccountPayload {
  userId: string;
  deviceId: string;
}
