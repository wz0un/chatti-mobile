/**
 * Chat message bubble — port of `src/components/ChatMessage.js`.
 */

import { useI18n } from '../../lib/useI18n';

interface ChatMessageProps {
  message: string;
  author: string;
  username: string;
  isSystem: boolean;
  timestamp: string;
}

export default function ChatMessage({ message, author, username, isSystem, timestamp }: ChatMessageProps) {
  const { locale } = useI18n();
  const isOwnMessage = author === username;

  const formatTime = (ts: string): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isSystem) {
    return (
      <div className="msg msg--system">
        <span className="msg__systemText">{message}</span>
      </div>
    );
  }

  return (
    <div className={isOwnMessage ? 'msg msg--own' : 'msg msg--other'}>
      {!isOwnMessage && <span className="msg__author">{author}</span>}
      <div className={isOwnMessage ? 'msg__bubble msg__bubble--own' : 'msg__bubble msg__bubble--other'}>
        <span className={isOwnMessage ? 'msg__text msg__text--own' : 'msg__text msg__text--other'}>
          {message}
        </span>
        <span className={isOwnMessage ? 'msg__time msg__time--own' : 'msg__time msg__time--other'}>
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
