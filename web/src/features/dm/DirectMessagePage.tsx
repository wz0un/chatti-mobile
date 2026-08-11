/**
 * Direct Message chat page — port of `src/screens/DirectMessageScreen.js`.
 * Encrypted 1:1 chat over the shared DirectMessageSocket: history decrypt,
 * dedupe by id, auto-scroll, typing indicator, last-seen writes,
 * connection/encrypted banners.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import type { DecryptedMessage, User } from '@shared/types';
import { DirectMessageSocket } from '@shared/ws/DirectMessageSocket';
import { LocalStorageAdapter, lastSeenKey } from '@shared/storage/StorageAdapter';
import { API_URL } from '../../config';
import { useI18n } from '../../lib/useI18n';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

import './directMessage.css';

interface DirectMessageState {
  recipientId: string;
  recipientUsername?: string;
  recipientPublicKey?: string | null;
}

const storage = new LocalStorageAdapter();

export default function DirectMessagePage({ user }: { user: User }) {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<DirectMessageState>;
  const recipientId = state.recipientId ?? '';
  const recipientUsername = state.recipientUsername ?? '';
  const recipientPublicKey = state.recipientPublicKey ?? null;
  const { t } = useI18n();

  const [messageList, setMessageList] = useState<DecryptedMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<Set<string>>(new Set());
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<DirectMessageSocket | null>(null);
  const messageListRef = useRef<DecryptedMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  // Mark as seen (mobile parity: on open, on history, on message)
  useEffect(() => {
    if (!recipientId) return;
    let active = true;
    void (async () => {
      try {
        const lastSeenStr = (await storage.getItem(lastSeenKey(user.userId))) ?? '{}';
        const lastSeen = JSON.parse(lastSeenStr) as Record<string, number>;
        if (!active) return;
        lastSeen[recipientId] = Date.now();
        await storage.setItem(lastSeenKey(user.userId), JSON.stringify(lastSeen));
      } catch (error) {
        console.error('Error updating lastSeen:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [recipientId, user.userId]);

  // Socket lifecycle
  useEffect(() => {
    if (!conversationId) return;

    const socket = new DirectMessageSocket();
    socketRef.current = socket;

    void socket.connect(
      conversationId,
      user.userId,
      user.fullUsername,
      recipientId,
      API_URL,
      recipientPublicKey,
    );

    socket.on('connected', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnected', () => {
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('DM error:', error);
      setConnectionError(error.message || t('directMessage.connectionError'));
      setIsConnected(false);
    });

    socket.on('history', (data) => {
      setMessageList(data.messages);
      messageListRef.current = data.messages;
    });

    socket.on('message', (data) => {
      // Functional update to avoid duplicates (mobile parity)
      setMessageList((currentList) => {
        if (currentList.some((m) => m.id === data.id)) {
          return currentList;
        }
        const newList = [...currentList, data];
        messageListRef.current = newList;
        return newList;
      });
    });

    socket.on('typing', (data) => {
      setIsTyping((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.username ?? '');
        } else {
          next.delete(data.username ?? '');
        }
        return next;
      });
    });

    socket.on('key_exchanged', () => {
      setIsEncrypted(true);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, user.userId, user.fullUsername, recipientId, recipientPublicKey, t]);

  // Auto-scroll to bottom when new messages arrive (mobile parity: 100ms)
  useEffect(() => {
    if (messageList.length === 0) return;
    const id = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => window.clearTimeout(id);
  }, [messageList]);

  const handleSendMessage = (message: string) => {
    socketRef.current?.sendMessage(message);
  };

  const handleTyping = (typing: boolean) => {
    socketRef.current?.sendTypingIndicator(typing);
  };

  const title = recipientUsername || t('directMessage.fallbackTitle', { id: recipientId.substring(0, 8) });

  return (
    <div className="dm">
      <header className="dm__header">
        <Link to="/chats" className="dm__back" aria-label="Back">
          ←
        </Link>
        <h1 className="dm__title">{title}</h1>
        <div className="dm__status">
          <span
            className={isConnected ? 'dm__dot dm__dot--connected' : 'dm__dot dm__dot--disconnected'}
          />
          <span className="dm__statusText">
            {isEncrypted ? t('common.encrypted') : t('common.notEncrypted')}
          </span>
        </div>
      </header>

      {connectionError && (
        <div className="dm__errorBanner">
          <span className="dm__bannerText">⚠️ {connectionError || t('directMessage.connectionError')}</span>
        </div>
      )}

      {!isConnected && !connectionError && (
        <div className="dm__warningBanner">
          <span className="dm__bannerText">{t('common.connectingEncrypted')}</span>
        </div>
      )}

      <div className="dm__messageList">
        {messageList.map((item) => (
          <ChatMessage
            key={item.id}
            message={item.content}
            author={item.senderId === user.userId ? user.fullUsername : recipientUsername}
            username={user.fullUsername}
            isSystem={false}
            timestamp={item.timestamp}
          />
        ))}
        <div ref={endRef} />
      </div>

      {isTyping.size > 0 && <TypingIndicator usernames={Array.from(isTyping)} />}

      <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} disabled={!isConnected} />
    </div>
  );
}
