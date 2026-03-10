/**
 * User Authentication Service for React Native
 * Manages device ID and user registration with discriminator
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';
import EncryptionService from './EncryptionService';
import ChatHistoryService from './ChatHistoryService';
import * as Device from 'expo-device';

// Configuration - Set to false for local development
// La URL se lee desde el archivo .env
const API_BASE_URL = process.env.EXPO_PUBLIC_WORKER_URL || 'http://localhost:8788';

class AuthService {
    /**
     * Robustly parse JSON from response and handle errors
     */
    static async parseJsonResponse(response) {
        const text = await response.text();
        try {
            if (!text || text.trim() === '') {
                if (response.ok) return { success: true };
                throw new Error(`Empty response from server (Status: ${response.status})`);
            }
            const data = JSON.parse(text);
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error('JSON Parse error:', error, 'Full response:', text);
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON from server: ${text.substring(0, 100)}... (Status: ${response.status})`);
            }
            throw error;
        }
    }

    /**
     * Get or create device ID using Expo Device
     */
    static async getDeviceId() {
        try {
            let deviceId = await AsyncStorage.getItem('deviceId');

            if (!deviceId) {
                // Use device info to create more stable ID
                const deviceInfo = {
                    brand: Device.brand,
                    modelName: Device.modelName,
                    osName: Device.osName,
                    osVersion: Device.osVersion,
                };

                // Generate unique device ID
                deviceId = this.generateDeviceId(deviceInfo);
                await AsyncStorage.setItem('deviceId', deviceId);
            }

            return deviceId;
        } catch (error) {
            console.error('Error getting device ID:', error);
            // Fallback to random ID
            return this.generateDeviceId({});
        }
    }

    /**
     * Generate unique device ID
     */
    static generateDeviceId(deviceInfo) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const deviceHash = JSON.stringify(deviceInfo).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        return `device_${timestamp}_${Math.abs(deviceHash)}_${random}`;
    }
    /**
     * Register new user with username and password
     * Returns user object with discriminator
     */
    static async registerUser(username, password) {
        try {
            const deviceId = await this.getDeviceId();

            // Get Push Token
            const notificationService = new NotificationService();
            const expoPushToken = await notificationService.getExpoPushToken();

            // Get Encryption Public Key
            await EncryptionService.initialize();
            const publicKey = await EncryptionService.getPublicKey();

            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                    deviceId,
                    expoPushToken,
                    publicKey,
                }),
            });

            const data = await this.parseJsonResponse(response);

            if (!data.success) {
                throw new Error(data.error || 'Failed to register user');
            }

            // Save user data locally
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));

            return data.user;
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    /**
     * Login user with username#discriminator and password
     * Returns user object
     */
    static async loginUser(fullUsername, password) {
        try {
            // Get Push Token
            const notificationService = new NotificationService();
            const expoPushToken = await notificationService.getExpoPushToken();

            // Get Encryption Public Key
            await EncryptionService.initialize();
            const publicKey = await EncryptionService.getPublicKey();

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullUsername: fullUsername.trim(),
                    password,
                    expoPushToken,
                    publicKey,
                }),
            });

            const data = await this.parseJsonResponse(response);

            if (!data.success) {
                throw new Error(data.error || 'Failed to login');
            }

            // Save user data locally
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));

            return data.user;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    }

    /**
     * Get current user data
     */
    static async getCurrentUser() {
        try {
            const userData = await AsyncStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Update push token for existing user
     */
    static async updatePushToken() {
        try {
            const user = await this.getCurrentUser();
            if (!user?.userId) return false;

            const deviceId = await this.getDeviceId();
            const notificationService = new NotificationService();
            const expoPushToken = await notificationService.getExpoPushToken();

            if (!expoPushToken || expoPushToken === 'expo-go-mock-token' || expoPushToken === 'development-mock-token') {
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/update-push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.userId,
                    deviceId,
                    expoPushToken,
                }),
            });

            if (!response.ok) return false;

            const data = await this.parseJsonResponse(response);
            return data.success || false;
        } catch (error) {
            console.error('Error updating push token:', error);
            return false;
        }
    }

    /**
     * Logout user
     */
    static async logout() {
        try {
            // Clear all chat history from local storage
            await ChatHistoryService.clearAllHistory();
            await AsyncStorage.removeItem('userData');
            // Keep deviceId for future logins
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    /**
     * Format username with discriminator
     */
    static formatUsername(username, discriminator) {
        return `${username}#${discriminator}`;
    }
}

export default AuthService;
