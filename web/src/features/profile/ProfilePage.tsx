/**
 * Profile section — user card + device ID copy + logout
 * (mobile ProfileScreen essentials).
 */

import { useState } from 'react';

import type { User } from '@shared/types';
import { useI18n } from '../../lib/useI18n';

import './profile.css';

interface ProfilePageProps {
  user: User;
  onLogout: () => void;
}

export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyDeviceId = async () => {
    try {
      await navigator.clipboard.writeText(user.deviceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying device ID:', error);
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

      <button type="button" className="profile__logout" onClick={onLogout}>
        {t('profile.items.logout')}
      </button>
    </section>
  );
}
