/**
 * REST API Service — port of `src/services/ApiService.js` (fetch).
 * Reuses the existing backend; implements only the endpoints defined in
 * docs/WEB-TASKS.md Task 5. `listUsers`/`searchUsers` are intentionally
 * NOT ported (backend disabled for privacy).
 */

import {
  API_BASE_URL,
  ENDPOINTS,
  type AuthResponse,
  type ContactRequestActionPayload,
  type ContactRequestPayload,
  type ContactRequestsResponse,
  type ContactsListResponse,
  type ConversationsResponse,
  type CreateRoomPayload,
  type DeleteAccountPayload,
  type DeleteDmPayload,
  type PublicKeyResponse,
  type RegisterPayload,
  type LoginPayload,
  type RoomMessagesResponse,
  type RoomsResponse,
  type StartDmResponse,
} from './contracts';
import type {
  Contact,
  ContactRequest,
  Conversation,
  Room,
  RoomInfo,

  User,
} from '../types';

const jsonHeaders = { 'Content-Type': 'application/json' };

export class ApiService {
  /** Base URL for all API calls. Web bootstrap calls `configure(import.meta.env.VITE_API_URL)`. */
  static baseUrl: string = API_BASE_URL;

  static configure(baseUrl?: string): void {
    if (baseUrl) ApiService.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /** Fetch list of available rooms (paginated). */
  static async listRooms(cursor: string | null = null, limit = 20): Promise<RoomsResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.rooms}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      rooms: data.rooms ?? [],
      cursor: data.cursor,
      hasMore: data.hasMore ?? false,
    };
  }

  /** Create a new room. */
  static async createRoom(
    name: string,
    owner: string,
    isPrivate = false,
    password: string | null = null,
  ): Promise<Room> {
    const payload: CreateRoomPayload = { name, owner, isPrivate, password };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.roomCreate}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error ?? 'Failed to create room');
    }
    return data.room as Room;
  }

  /** Get room information. */
  static async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.roomInfo(roomId)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as RoomInfo;
  }

  /** Fetch message history for a room (paginated). */
  static async getMessageHistory(
    roomId: string,
    cursor: string | null = null,
    limit = 50,
  ): Promise<RoomMessagesResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.roomMessages(roomId)}?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      messages: data.messages ?? [],
      nextCursor: data.nextCursor,
      hasMore: data.hasMore ?? false,
    };
  }

  /** Post a message via HTTP (fallback when WebSocket is unavailable). */
  static async postMessage(
    roomId: string,
    username: string,
    content: string,
    userId: string | null = null,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.roomPost(roomId)}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ username, userId, content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Failed to post message');
    }
    return data.id as string;
  }

  /** Find user by full username (`name#disc`). Returns null when not found (404). */
  static async findUserByUsername(fullUsername: string): Promise<User | null> {
    const params = new URLSearchParams({ username: fullUsername });
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.usersFind}?${params.toString()}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? (data.user as User) : null;
  }

  /** Get user by device ID. Returns null when not found (404). */
  static async getUserByDeviceId(deviceId: string): Promise<User | null> {
    const params = new URLSearchParams({ deviceId });
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.usersByDeviceId}?${params.toString()}`,
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? (data.user as User) : null;
  }

  /** Fetch a user's E2E public key. */
  static async getPublicKey(userId: string): Promise<string | null> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.usersPublicKey}?${params.toString()}`);
    if (!response.ok) return null;

    const data = (await response.json()) as PublicKeyResponse;
    if (data.success && data.publicKey) return data.publicKey;
    return null;
  }

  /** Start a new direct message conversation. */
  static async startDirectMessage(
    userId: string,
    recipientId: string,
  ): Promise<{ conversationId: string; url: string }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.dmStart}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ userId, recipientId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as StartDmResponse;
    if (!data.success || !data.conversationId) {
      throw new Error(data.error ?? 'Failed to start conversation');
    }
    return { conversationId: data.conversationId, url: data.url ?? '' };
  }

  /** Get user's conversations. */
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.dmConversations}?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ConversationsResponse;
    return data.conversations ?? [];
  }

  /** Delete a conversation. */
  static async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const payload: DeleteDmPayload = { userId, conversationId };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.dmDelete}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success === true;
  }

  /** Send a contact request. */
  static async sendContactRequest(
    senderId: string,
    recipientDeviceId: string,
    senderUsername: string,
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    const payload: ContactRequestPayload = { senderId, recipientDeviceId, senderUsername };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.contactsRequest}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* non-JSON error body */
      }
      throw new Error(data.error ?? 'Failed to send contact request');
    }

    return (await response.json()) as { success: boolean; requestId?: string; error?: string };
  }

  /** Get incoming contact requests. */
  static async getContactRequests(userId: string): Promise<ContactRequest[]> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.contactsRequests}?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ContactRequestsResponse;
    return data.requests ?? [];
  }

  /** Accept a contact request. */
  static async acceptContactRequest(
    requestId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payload: ContactRequestActionPayload = { requestId, userId };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.contactsAccept}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* non-JSON error body */
      }
      throw new Error(data.error ?? 'Failed to accept contact request');
    }

    return (await response.json()) as { success: boolean; error?: string };
  }

  /** Reject a contact request. */
  static async rejectContactRequest(
    requestId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payload: ContactRequestActionPayload = { requestId, userId };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.contactsReject}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* non-JSON error body */
      }
      throw new Error(data.error ?? 'Failed to reject contact request');
    }

    return (await response.json()) as { success: boolean; error?: string };
  }

  /** Get contacts list. */
  static async getContactsList(userId: string): Promise<Contact[]> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.contactsList}?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ContactsListResponse;
    return data.contacts ?? [];
  }

  /** Delete user account. */
  static async deleteAccount(userId: string, deviceId: string): Promise<boolean> {
    const payload: DeleteAccountPayload = { userId, deviceId };
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.authDelete}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* non-JSON error body */
      }
      throw new Error(data.error ?? 'Failed to delete account');
    }

    const data = await response.json();
    return data.success === true;
  }

  /** Register endpoint — used by AuthService (contract kept in one place). */
  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.authRegister}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return this.parseAuthResponse(response);
  }

  /** Login endpoint — used by AuthService (contract kept in one place). */
  static async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.authLogin}`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return this.parseAuthResponse(response);
  }

  private static async parseAuthResponse(response: Response): Promise<AuthResponse> {
    if (!response.ok) {
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        /* non-JSON error body */
      }
      throw new Error(data.error ?? `HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as AuthResponse;
  }
}

export default ApiService;
