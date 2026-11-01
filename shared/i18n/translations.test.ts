import { interpolate, localeFor, translate, translations } from './translations';
import {
  lastSeenKey,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  STORAGE_KEYS,
} from '../storage/StorageAdapter';

describe('translations', () => {
  it('has all four mobile languages', () => {
    expect(Object.keys(translations)).toEqual(['en', 'es', 'ar', 'fr']);
  });

  it('webPush statusBlocked is present in all languages (P3 QA 2026-09-21)', () => {
    for (const lang of Object.keys(translations) as Array<keyof typeof translations>) {
      expect(translate(lang, 'profile.webPush.statusBlocked')).not.toBe(
        'profile.webPush.statusBlocked',
      );
    }
  });

  it('translates known keys per language', () => {
    expect(translate('en', 'tabs.chats')).toBe('Chats');
    expect(translate('es', 'tabs.chats')).toBe('Chats');
    expect(translate('es', 'tabs.contacts')).toBe('Contactos');
    expect(translate('ar', 'tabs.rooms')).toBe('الغرف');
    expect(translate('fr', 'tabs.profile')).toBe('Profil');
  });

  it('falls back to English for missing keys', () => {
    expect(translate('ar', 'login.success.register', { username: 'x' })).toContain('Registration successful');
  });

  it('returns the raw key when a key is missing everywhere', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });

  it('returns the raw key when the resolved value is not a string', () => {
    expect(translate('en', 'time.days')).toBe('time.days');
  });

  it('interpolates params', () => {
    expect(translate('en', 'login.success.register', { username: 'alice#1234' })).toContain(
      'alice#1234',
    );
    expect(translate('en', 'rooms.welcome', { name: 'Bob' })).toBe('Hi, Bob');
  });

  it('interpolate replaces all occurrences', () => {
    expect(interpolate('{{a}}-{{a}}', { a: 'x' })).toBe('x-x');
  });

  it('interpolate without params returns the text unchanged', () => {
    expect(interpolate('plain text')).toBe('plain text');
  });

  it('maps languages to locales', () => {
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('es')).toBe('es-ES');
    expect(localeFor('ar')).toBe('ar');
    expect(localeFor('fr')).toBe('fr-FR');
  });
});

describe('StorageAdapter', () => {
  it('memory adapter round-trips values', async () => {
    const storage = new MemoryStorageAdapter();
    expect(await storage.getItem(STORAGE_KEYS.userData)).toBeNull();
    await storage.setItem(STORAGE_KEYS.userData, '{"userId":"1"}');
    expect(await storage.getItem(STORAGE_KEYS.userData)).toBe('{"userId":"1"}');
    await storage.removeItem(STORAGE_KEYS.userData);
    expect(await storage.getItem(STORAGE_KEYS.userData)).toBeNull();
  });

  it('localStorage adapter round-trips values (jsdom not required; falls back to memory)', async () => {
    const storage = new LocalStorageAdapter();
    await storage.setItem(STORAGE_KEYS.language, 'es');
    expect(await storage.getItem(STORAGE_KEYS.language)).toBe('es');
    await storage.removeItem(STORAGE_KEYS.language);
    expect(await storage.getItem(STORAGE_KEYS.language)).toBeNull();
  });

  it('lastSeenKey follows the mobile key format', () => {
    expect(lastSeenKey('user_42')).toBe('lastSeen_user_42');
  });
});
