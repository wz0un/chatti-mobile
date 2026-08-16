/**
 * User Authentication Service — port of `src/services/AuthService.js`.
 * Device-based auth, no tokens (the backend is unauthenticated; `userId`
 * is the auth handle). Session persisted via StorageAdapter under the
 * mobile-compatible `userData` key.
 *
 * Web specifics (spec: docs/WEB-ARCHITECTURE.md §5.2):
 * - `expoPushToken` is `null` (no Expo push on web).
 * - `deviceId` mirrors `device_${ts}_${hash}_${rand}` using the user agent.
 */

import type { EncryptionService } from '../crypto/EncryptionService';
import { defaultEncryptionService } from '../crypto/EncryptionService';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { LocalStorageAdapter, STORAGE_KEYS } from '../storage/StorageAdapter';
import type { User } from '../types';
import { ApiService } from '../api/ApiService';
import { generateDeviceId } from './deviceId';

export class AuthService {
  private readonly storage: StorageAdapter;
  private readonly encryption: EncryptionService;

  constructor(
    storage: StorageAdapter = new LocalStorageAdapter(),
    encryption: EncryptionService = defaultEncryptionService,
  ) {
    this.storage = storage;
    this.encryption = encryption;
  }

  /**
   * Get or create device ID (persisted).
   */
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await this.storage.getItem(STORAGE_KEYS.deviceId);
      if (!deviceId) {
        deviceId = generateDeviceId();
        await this.storage.setItem(STORAGE_KEYS.deviceId, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return generateDeviceId();
    }
  }

  /**
   * Register new user with username and password.
   * Returns user object with discriminator.
   */
  async registerUser(username: string, password: string): Promise<User> {
    try {
      const deviceId = await this.getDeviceId();

      await this.encryption.initialize();
      const publicKey = await this.encryption.getPublicKey();

      const data = await ApiService.register({
        username: username.trim(),
        password,
        deviceId,
        expoPushToken: null,
        publicKey,
      });

      if (!data.success || !data.user) {
        throw new Error(data.error ?? 'Failed to register user');
      }

      await this.storage.setItem(STORAGE_KEYS.userData, JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login user with `username#discriminator` and password.
   * Returns user object.
   */
  async loginUser(fullUsername: string, password: string): Promise<User> {
    try {
      await this.encryption.initialize();
      const publicKey = await this.encryption.getPublicKey();

      const data = await ApiService.login({
        fullUsername: fullUsername.trim(),
        password,
        expoPushToken: null,
        publicKey,
      });

      if (!data.success || !data.user) {
        throw new Error(data.error ?? 'Failed to login');
      }

      await this.storage.setItem(STORAGE_KEYS.userData, JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  /**
   * Get current user data (session restore).
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await this.storage.getItem(STORAGE_KEYS.userData);
      return userData ? (JSON.parse(userData) as User) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Update push token — not applicable on web (no Expo push tokens).
   */
  async updatePushToken(): Promise<boolean> {
    return false;
  }

  /**
   * Logout user (local only — removes `userData`; keeps `deviceId`).
   */
  async logout(): Promise<void> {
    try {
      await this.storage.removeItem(STORAGE_KEYS.userData);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  /**
   * Format username with discriminator.
   */
  static formatUsername(username: string, discriminator: string): string {
    return `${username}#${discriminator}`;
  }
}

export default new AuthService();
