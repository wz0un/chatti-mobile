/**
 * Contacts page — port of `src/screens/ContactsScreen.js`.
 * Displays accepted contacts, pending request count badge, add-contact
 * flow (username#tag → send request), and requests view (accept/reject).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Contact, ContactRequest, User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import { useI18n } from '../../lib/useI18n';

import './contacts.css';

interface ContactsPageProps {
  user: User;
}

type View = 'list' | 'add' | 'requests';

export default function ContactsPage({ user }: ContactsPageProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [rejectTarget, setRejectTarget] = useState<ContactRequest | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const data = await ApiService.getContactsList(user.userId);
      setContacts(data);
    } catch {
      console.error('Error loading contacts');
    }
  }, [user.userId]);

  const loadRequests = useCallback(async () => {
    try {
      const data = await ApiService.getContactRequests(user.userId);
      setRequests(data);
      setPendingCount(data.length);
    } catch {
      console.error('Error loading requests');
    }
  }, [user.userId]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadContacts(), loadRequests()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadContacts, loadRequests]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadAll();
  };

  const handleContactPress = async (contact: Contact) => {
    try {
      const fullUser = await ApiService.findUserByUsername(contact.fullUsername);
      if (!fullUser || !fullUser.publicKey) {
        console.error('Could not retrieve public key for contact:', contact.fullUsername);
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
    } catch {
      console.error('Error starting conversation with contact');
    }
  };

  const handleSendRequest = async () => {
    const input = addInput.trim();
    if (!input) return;

    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    try {
      if (!input.includes('#')) {
        setAddError(t('addContact.errors.invalidFormat'));
        return;
      }

      const fullUser = await ApiService.findUserByUsername(input);
      if (!fullUser) {
        setAddError(t('addContact.errors.notFound'));
        return;
      }

      if (fullUser.userId === user.userId) {
        setAddError(t('addContact.errors.self'));
        return;
      }

      const alreadyExists = contacts.some((c) => c.userId === fullUser.userId);
      if (alreadyExists) {
        setAddError(t('addContact.errors.alreadyContact'));
        return;
      }

      await ApiService.sendContactRequest(user.userId, fullUser.deviceId, user.fullUsername);
      setAddSuccess(t('addContact.successMessage', { username: input }));
      setAddInput('');
    } catch (err) {
      console.error('Error sending contact request:', err);
      setAddError(t('addContact.errors.send'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleAcceptRequest = async (req: ContactRequest) => {
    try {
      await ApiService.acceptContactRequest(req.requestId, user.userId);
      await Promise.all([loadContacts(), loadRequests()]);
    } catch {
      console.error('Error accepting request');
    }
  };

  const handleRejectRequest = async (req: ContactRequest) => {
    try {
      await ApiService.rejectContactRequest(req.requestId, user.userId);
      setRejectTarget(null);
      await loadRequests();
    } catch {
      console.error('Error rejecting request');
    }
  };

  return (
    <section className="section">
      <div className="contacts__header">
        <h1 className="section__title">{t('contacts.title')}</h1>
        <div className="contacts__headerButtons">
          <button
            type="button"
            className="contacts__headerBtn"
            onClick={() => setView(view === 'requests' ? 'list' : 'requests')}
          >
            {t('contacts.requests')}
            {pendingCount > 0 && (
              <span className="contacts__badge">{pendingCount}</span>
            )}
          </button>
          <button
            type="button"
            className="contacts__addBtn"
            onClick={() => setView(view === 'add' ? 'list' : 'add')}
          >
            +
          </button>
        </div>
      </div>

      {view === 'add' && (
        <div className="contacts__addPanel">
          <p className="contacts__addDesc">{t('addContact.description')}</p>
          <div className="contacts__addRow">
            <input
              type="text"
              className="contacts__addInput"
              placeholder={t('addContact.placeholder')}
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSendRequest();
                }
              }}
              disabled={addLoading}
            />
            <button
              type="button"
              className="contacts__sendBtn"
              onClick={() => void handleSendRequest()}
              disabled={!addInput.trim() || addLoading}
            >
              {addLoading ? t('common.loading') : t('addContact.send')}
            </button>
          </div>
          {addError && <p className="contacts__error">{addError}</p>}
          {addSuccess && <p className="contacts__success">{addSuccess}</p>}
        </div>
      )}

      {view === 'requests' ? (
        <div className="contacts__list">
          {loading ? (
            <div className="contacts__center">
              <p className="contacts__loading">{t('common.loading')}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="contacts__center">
              <p className="contacts__emptyTitle">{t('contactRequests.emptyTitle')}</p>
              <p className="contacts__emptySubtitle">{t('contactRequests.emptySubtitle')}</p>
            </div>
          ) : (
            requests.map((req) => (
              <div key={req.requestId} className="contacts__requestItem">
                <div className="contacts__requestInfo">
                  <span className="contacts__requestUser">{req.senderUsername}</span>
                  <span className="contacts__requestTime">
                    {formatRelativeTime(req.createdAt, t)}
                  </span>
                </div>
                <div className="contacts__requestActions">
                  <button
                    type="button"
                    className="contacts__acceptBtn"
                    onClick={() => void handleAcceptRequest(req)}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="contacts__rejectBtn"
                    onClick={() => setRejectTarget(req)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="contacts__list">
          {loading && !refreshing ? (
            <div className="contacts__center">
              <p className="contacts__loading">{t('common.loading')}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="contacts__center">
              <p className="contacts__emptyTitle">{t('contacts.emptyTitle')}</p>
              <p className="contacts__emptySubtitle">{t('contacts.emptySubtitle')}</p>
              <button
                type="button"
                className="contacts__emptyBtn"
                onClick={() => setView('add')}
              >
                + {t('contacts.addContact')}
              </button>
            </div>
          ) : (
            <>
              {contacts.map((contact) => (
                <div
                  key={contact.userId}
                  className="contacts__contactItem"
                  onClick={() => void handleContactPress(contact)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleContactPress(contact);
                    }
                  }}
                >
                  <div className="contacts__avatar">
                    {(contact.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="contacts__contactInfo">
                    <span className="contacts__contactName">{contact.fullUsername}</span>
                    {contact.deviceId && (
                      <span className="contacts__contactDeviceId">{contact.deviceId}</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {refreshing && <p className="contacts__refreshing">{t('common.loading')}</p>}

      <div className="contacts__refreshWrap">
        <button
          type="button"
          className="contacts__refreshBtn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          ↻
        </button>
      </div>

      {rejectTarget && (
        <div className="contacts__modal">
          <div className="contacts__modalContent">
            <p>{t('contactRequests.rejectMessage', { username: rejectTarget.senderUsername })}</p>
            <div className="contacts__modalActions">
              <button
                type="button"
                className="contacts__modalCancel"
                onClick={() => setRejectTarget(null)}
              >
                {t('contactRequests.rejectConfirm')}
              </button>
              <button
                type="button"
                className="contacts__modalConfirm"
                onClick={() => void handleRejectRequest(rejectTarget)}
              >
                {t('contactRequests.rejectConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatRelativeTime(isoDate: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return t('contactRequestItem.minutes', { value: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('contactRequestItem.hours', { value: hours });
  const days = Math.floor(hours / 24);
  return t('contactRequestItem.days', { value: days });
}
