/**
 * Conversations page — port of `src/screens/ConversationsScreen.js`.
 * Fetch + dedupe + sort + recipient normalization (exact parity),
 * search filter, unread dots from lastSeen, 30s polling, delete with
 * confirm, refresh button.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Conversation, NormalizedConversation, User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import { LocalStorageAdapter, lastSeenKey } from '@shared/storage/StorageAdapter';
import { useI18n } from '../../lib/useI18n';
import StartConversation from '../dm/StartConversation';
import ConversationListItem from './ConversationListItem';

import './conversations.css';

const POLL_INTERVAL_MS = 30000;

const storage = new LocalStorageAdapter();

interface ConversationsPageProps {
  user: User;
}

export default function ConversationsPage({ user }: ConversationsPageProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<NormalizedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSeenData, setLastSeenData] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const loadLastSeen = useCallback(async () => {
    try {
      const data = await storage.getItem(lastSeenKey(user.userId));
      if (data) {
        setLastSeenData(JSON.parse(data) as Record<string, string>);
      }
    } catch (error) {
      console.error('Error loading lastSeen:', error);
    }
  }, [user.userId]);

  const loadConversations = useCallback(async () => {
    try {
      const convos = await ApiService.getUserConversations(user.userId);

        if (!convos || !Array.isArray(convos)) {
          setConversations([]);
          return;
        }

        // Dedupe + sort (same logic as mobile)
        const uniqueConvos: NormalizedConversation[] = [];
        const seenRecipients = new Set<string>();

        const sortedConvos = [...convos].sort((a: Conversation, b: Conversation) => {
          const timeA = new Date(
            (typeof a.lastMessage === 'object' && a.lastMessage?.timestamp) ||
              a.lastMessageTime ||
              a.createdAt ||
              0,
          ).getTime();
          const timeB = new Date(
            (typeof b.lastMessage === 'object' && b.lastMessage?.timestamp) ||
              b.lastMessageTime ||
              b.createdAt ||
              0,
          ).getTime();
          return timeB - timeA;
        });

        const currentUserId = String(user.userId).toLowerCase();

        for (const convo of sortedConvos) {
          const otherParticipant = convo.participants?.find(
            (p) => String(p).toLowerCase() !== currentUserId,
          );

          const rId = convo.recipient?.userId || convo.recipientId || otherParticipant || convo.id;
          const normalizedRecipientId = String(rId).toLowerCase();

          if (!seenRecipients.has(normalizedRecipientId)) {
            uniqueConvos.push({
              ...convo,
              normalizedRecipientId,
              recipientUsername:
                convo.recipient?.username || convo.recipientUsername || 'Usuario',
            });
            seenRecipients.add(normalizedRecipientId);
          }
        }

        setConversations(uniqueConvos);
      } catch (error) {
        console.error('Error loading conversations:', error);
        console.error(t('conversations.errorLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.userId, t],
  );

  // Initial load (loading starts true; cleared by the async finally)
  useEffect(() => {
    void (async () => {
      await loadConversations();
      await loadLastSeen();
    })();
  }, [loadConversations, loadLastSeen]);

  // 30s polling (mobile parity) — also refreshes the clock for time labels
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadConversations();
      setNow(Date.now());
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  // Search filter (derived, not stored — same semantics as mobile)
  const filteredConversations = useMemo(() => {
    if (searchQuery.trim() === '') {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter((convo) => {
      const username = (convo.recipient?.username || convo.recipientUsername || '').toLowerCase();
      return username.includes(query);
    });
  }, [searchQuery, conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadConversations();
    void loadLastSeen();
  };

  const handleConversationPress = (conversation: NormalizedConversation) => {
    navigate(`/dm/${conversation.conversationId || conversation.id}`, {
      state: {
        recipientId: conversation.normalizedRecipientId,
        recipientUsername:
          conversation.recipient?.fullUsername ||
          conversation.recipientUsername ||
          conversation.normalizedRecipientId,
        recipientPublicKey: conversation.recipient?.publicKey,
        userId: user.userId,
        username: user.fullUsername,
      },
    });
  };

  const deleteConversation = async (conversation: NormalizedConversation) => {
    const conversationId = conversation.conversationId || conversation.id;
    if (!conversationId) return;
    if (!window.confirm(`${t('conversations.deleteMessage')}`)) return;

    try {
      setLoading(true);
      await ApiService.deleteConversation(user.userId, conversationId);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      window.alert(`${t('conversations.deleteError')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (conversation: NormalizedConversation) => {
    void deleteConversation(conversation);
  };

  return (
    <section className="convs">
      <div className="convs__search">
        <input
          type="search"
          className="convs__searchInput"
          placeholder={t('usersList.placeholder')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search conversations"
        />
        <button
          type="button"
          className="convs__refresh"
          aria-label="Refresh"
          onClick={handleRefresh}
        >
          ⟳
        </button>
      </div>

      <StartConversation user={user} />

      {loading && conversations.length === 0 ? (
        <div className="convs__center">
          <p className="convs__loading">{t('common.loading')}</p>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="convs__center">
          <p className="convs__emptyText">
            {searchQuery ? t('usersList.emptySearch') : t('conversations.emptyTitle')}
          </p>
          <p className="convs__emptySubtext">
            {searchQuery ? t('usersList.emptySearch') : t('conversations.emptySubtitle')}
          </p>
        </div>
      ) : (
        <ul className="convs__list">
          {filteredConversations.map((item) => {
            const msgTime =
              (typeof item.lastMessage === 'object' && item.lastMessage?.timestamp) ||
              item.lastMessageTime ||
              item.createdAt;
            const timestamp = msgTime ? new Date(msgTime).getTime() : 0;
            const lastSeenTime = Number(lastSeenData[item.normalizedRecipientId]) || 0;
            const isUnread = timestamp > lastSeenTime && timestamp > 0;

            return (
              <li key={(item.id || item.conversationId) + '-' + item.normalizedRecipientId}>
                <ConversationListItem
                  conversation={item}
                  currentUserId={user.userId}
                  isUnread={isUnread}
                  now={now}
                  onPress={() => handleConversationPress(item)}
                  onDelete={() => handleDelete(item)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {refreshing && <p className="convs__refreshing">{t('common.loading')}</p>}
    </section>
  );
}
