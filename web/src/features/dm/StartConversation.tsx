/**
 * Start conversation flow — port of the mobile workaround pattern
 * (UsersListScreen/ContactsScreen): find full user → get public key →
 * `POST /api/dm/start` → open the encrypted chat.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import { useI18n } from '../../lib/useI18n';

interface StartConversationProps {
  user: User;
}

export default function StartConversation({ user }: StartConversationProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const input = usernameInput.trim();
    if (!input) return;

    setError('');
    setLoading(true);

    try {
      // WORKAROUND (mobile parity): the list endpoint lacks public keys —
      // fetch the full user object to get the key.
      const fullUser = await ApiService.findUserByUsername(input);

      if (!fullUser || !fullUser.publicKey) {
        console.error('Could not retrieve public key for user:', input);
        setError(t('usersList.errorPublicKey'));
        return;
      }

      const result = await ApiService.startDirectMessage(user.userId, fullUser.userId);

      navigate(`/dm/${result.conversationId}`, {
        state: {
          recipientId: fullUser.userId,
          recipientUsername: fullUser.fullUsername,
          recipientPublicKey: fullUser.publicKey,
        },
      });
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError(t('contacts.errorStart'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="startConvo">
      <p className="startConvo__label">{t('addContact.description')}</p>
      <div className="startConvo__row">
        <input
          type="text"
          className="startConvo__input"
          placeholder={t('addContact.placeholder')}
          value={usernameInput}
          onChange={(event) => setUsernameInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleStart();
            }
          }}
          disabled={loading}
          aria-label="Username"
        />
        <button
          type="button"
          className="startConvo__button"
          onClick={() => void handleStart()}
          disabled={!usernameInput.trim() || loading}
        >
          {loading ? t('common.loading') : t('contacts.addContact')}
        </button>
      </div>
      {error && <p className="startConvo__error">{error}</p>}
    </div>
  );
}
