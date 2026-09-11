/**
 * Conversation list item — port of `src/components/ConversationListItem.js`
 * (avatar color, unread styling, time formatting, preview).
 */

import type { NormalizedConversation } from '@shared/types';
import { useI18n } from '../../lib/useI18n';

interface ConversationListItemProps {
  conversation: NormalizedConversation;
  currentUserId: string;
  isUnread: boolean;
  now: number;
  onPress: () => void;
  onDelete: () => void;
}

const AVATAR_COLORS = ['#5865F2', '#7289DA', '#25D366', '#0088CC', '#F23F42', '#F0B232'];

const getAvatarColor = (name: string): string => {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export default function ConversationListItem({
  conversation,
  currentUserId,
  isUnread,
  now,
  onPress,
  onDelete,
}: ConversationListItemProps) {
  const { t, locale } = useI18n();

  const otherUserId =
    conversation.participants?.find((id) => id !== currentUserId) ||
    conversation.normalizedRecipientId;

  const displayName =
    conversation.recipient?.fullUsername || conversation.recipientUsername || otherUserId;

  const initial = (
    conversation.recipient?.username || conversation.recipientUsername || otherUserId
  )
    .charAt(0)
    .toUpperCase();

  let lastMsg = t('conversations.emptyTitle');
  if (conversation.lastMessage) {
    lastMsg =
      typeof conversation.lastMessage === 'object'
        ? conversation.lastMessage.content || t('conversations.previewEncrypted')
        : conversation.lastMessage;
  }

  const formatTimestamp = (timestamp?: string, nowMs = now): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const diff = nowMs - date.getTime();

    if (diff < 86400000) {
      // Less than 24 hours
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      // Less than a week
      const days = [
        t('time.days.sun'),
        t('time.days.mon'),
        t('time.days.tue'),
        t('time.days.wed'),
        t('time.days.thu'),
        t('time.days.fri'),
        t('time.days.sat'),
      ];
      return days[date.getDay()];
    }
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  const msgTime =
    (typeof conversation.lastMessage === 'object' && conversation.lastMessage?.timestamp) ||
    conversation.lastMessageTime ||
    conversation.createdAt;

  const avatarColor = isUnread
    ? 'var(--gradient-primary)'
    : getAvatarColor(displayName);

  return (
    <div className={isUnread ? 'conv-item conv-item--unread' : 'conv-item'}>
      <div
        role="button"
        tabIndex={0}
        className="conv-item__main"
        onClick={onPress}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPress();
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onDelete();
        }}
      >
        <div className="conv-item__avatarWrap">
          <div className="conv-item__avatar" style={{ background: avatarColor }}>
            {initial}
          </div>
          <span className="conv-item__online" />
        </div>

        <div className="conv-item__content">
          <div className="conv-item__header">
            <span className={isUnread ? 'conv-item__username conv-item__username--unread' : 'conv-item__username'}>
              {displayName}
            </span>
            <span className={isUnread ? 'conv-item__time conv-item__time--unread' : 'conv-item__time'}>
              {formatTimestamp(msgTime)}
            </span>
          </div>

          <div className="conv-item__previewRow">
            <span className={isUnread ? 'conv-item__preview conv-item__preview--unread' : 'conv-item__preview'}>
              {lastMsg}
            </span>
            {isUnread && <span className="conv-item__unreadDot">•</span>}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="conv-item__delete"
        aria-label={t('conversations.deleteTitle')}
        title={t('conversations.deleteTitle')}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        🗑
      </button>
    </div>
  );
}
