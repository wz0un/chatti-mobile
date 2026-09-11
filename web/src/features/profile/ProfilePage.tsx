/**
 * Profile section — user card + device ID copy + language selector,
 * logout and delete account (mobile ProfileScreen essentials).
 */

import { useState } from 'react';
import type { ChangeEvent } from 'react';

import type { User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import type { LanguageCode } from '@shared/i18n/translations';
import { useI18n } from '../../lib/useI18n';

import './profile.css';

interface ProfilePageProps {
  user: User;
  onLogout: () => void;
}

const LANGUAGE_OPTIONS: { code: LanguageCode; flag: string }[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'ar', flag: '🇸🇦' },
  { code: 'fr', flag: '🇫🇷' },
];

const languageLabel = (code: LanguageCode): string => {
  switch (code) {
    case 'es':
      return 'Español';
    case 'ar':
      return 'العربية';
    case 'fr':
      return 'Français';
    default:
      return 'English';
  }
};

export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const { t, language, setLanguage } = useI18n();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const copyDeviceId = async () => {
    try {
      await navigator.clipboard.writeText(user.deviceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying device ID:', error);
    }
  };

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value as LanguageCode);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('profile.deleteMessage'))) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await ApiService.deleteAccount(user.userId, user.deviceId);
      await onLogout();
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(t('profile.deleteError'));
      setDeleting(false);
    }
  };

  return (
    <section className="section profile">
      <h1 className="section__title">{t('profile.title')}</h1>

      <div className="profile__card">
        <div className="profile__avatar">{user.username.charAt(0).toUpperCase()}</div>
        <h2 className="profile__name">{user.fullUsername}</h2>
        <p className="profile__username">@{user.username} · {user.discriminator}</p>

        <div className="profile__device">
          <p className="profile__deviceLabel">{t('profile.deviceIdTitle')}</p>
          <button type="button" className="profile__deviceId" onClick={copyDeviceId}>
            {user.deviceId ? `${user.deviceId.substring(0, 8)}...` : t('profile.deviceIdPlaceholder')}
          </button>
          <p className="profile__deviceHint">{t('profile.deviceIdDescription')}</p>
          {copied && <p className="profile__copied">{t('profile.copied')}</p>}
        </div>
      </div>

      <div className="profile__card">
        <div className="profile__language">
          <p className="profile__languageLabel">{t('profile.items.language')}</p>
          <select
            className="profile__languageSelect"
            value={language}
            onChange={handleLanguageChange}
            aria-label={t('profile.items.language')}
          >
            {LANGUAGE_OPTIONS.map(({ code, flag }) => (
              <option key={code} value={code}>
                {flag} {languageLabel(code)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        className="profile__logout"
        onClick={onLogout}
      >
        {t('profile.items.logout')}
      </button>

      <button
        type="button"
        className="profile__delete"
        onClick={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? t('common.loading') : t('profile.items.delete')}
      </button>
      {deleteError && <p className="profile__deleteError">{deleteError}</p>}
    </section>
  );
}
