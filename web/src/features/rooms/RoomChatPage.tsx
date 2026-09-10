/**
 * Room chat page — port of `src/screens/ChatScreen.js`.
 * Public group chat over the shared RoomSocket: history, messages,
 * typing indicator, user_joined/user_left system messages,
 * presence count, auto-scroll.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import type { RoomMessage, User } from '@shared/types';
import { RoomSocket } from '@shared/ws/RoomSocket';
import { API_URL } from '../../config';
import { useI18n } from '../../lib/useI18n';
import ChatInput from '../dm/ChatInput';
import ChatMessage from '../dm/ChatMessage';
import TypingIndicator from '../dm/TypingIndicator';

import '../dm/directMessage.css';
import './room-chat.css';

interface RoomChatState {
  roomName?: string;
}

export default function RoomChatPage({ user }: { user: User }) {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<RoomChatState>;
  const roomName = state.roomName ?? '';
  const { t } = useI18n();

  const [messageList, setMessageList] = useState<RoomMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<Set<string>>(new Set());
  const [totalUsers, setTotalUsers] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<RoomSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Socket lifecycle
  useEffect(() => {
    if (!roomId) return;

    const socket = new RoomSocket();
    socketRef.current = socket;

    socket.connect(roomId, user.fullUsername, user.userId, API_URL);

    socket.on('connected', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnected', () => {
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Room error:', error);
      setConnectionError(error.message || t('chat.connectionError'));
      setIsConnected(false);
    });

    socket.on('history', (data) => {
      setMessageList(data.messages);
    });

    socket.on('message', (data) => {
      setMessageList((currentList) => {
        if (currentList.some((m) => m.id === data.id)) {
          return currentList;
        }
        return [...currentList, data];
      });
    });

    socket.on('user_joined', (data) => {
      setTotalUsers(data.totalUsers);
      setMessageList((currentList) => [
        ...currentList,
        {
          id: `system-join-${data.username}-${Date.now()}`,
          username: 'system',
          content: t('chat.joined', { username: data.username }),
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
    });

    socket.on('user_left', (data) => {
      if (data.totalUsers !== undefined) {
        setTotalUsers(data.totalUsers);
      }
      setMessageList((currentList) => [
        ...currentList,
        {
          id: `system-leave-${data.username ?? 'unknown'}-${Date.now()}`,
          username: 'system',
          content: t('chat.left', { username: data.username ?? 'Someone' }),
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ]);
    });

    socket.on('user_list', (data) => {
      setTotalUsers(data.totalUsers);
    });

    socket.on('typing', (data) => {
      setIsTyping((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.username);
        } else {
          next.delete(data.username);
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, user.fullUsername, user.userId, t]);

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

  const title = roomName || t('chat.defaultTitle');

  return (
    <div className="room-chat">
      <header className="room-chat__header">
        <Link to="/rooms" className="room-chat__back" aria-label="Back">
          ←
        </Link>
        <h1 className="room-chat__title">{title}</h1>
        <div className="room-chat__status">
          <span
            className={
              isConnected
                ? 'room-chat__dot room-chat__dot--connected'
                : 'room-chat__dot room-chat__dot--disconnected'
            }
          />
          <span className="room-chat__statusText">
            {totalUsers > 0
              ? `${totalUsers} ${totalUsers === 1 ? t('chat.userCountOne', { count: totalUsers }) : t('chat.userCountOther', { count: totalUsers })}`
              : isConnected
                ? t('common.online')
                : t('common.offline')}
          </span>
        </div>
      </header>

      {connectionError && (
        <div className="room-chat__errorBanner">
          <span className="room-chat__bannerText">⚠️ {connectionError}</span>
        </div>
      )}

      {!isConnected && !connectionError && (
        <div className="room-chat__warningBanner">
          <span className="room-chat__bannerText">{t('common.connectingEncrypted')}</span>
        </div>
      )}

      <div className="room-chat__messageList">
        {messageList.map((item) => (
          <ChatMessage
            key={item.id}
            message={item.content}
            author={item.username}
            username={user.fullUsername}
            isSystem={item.isSystem ?? false}
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
