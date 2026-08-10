/**
 * Chat input — port of `src/components/ChatInput.js` with web keyboard
 * conventions: Enter sends, Shift+Enter inserts a newline. Typing
 * indicator stops after 2s of inactivity (mobile parity).
 */

import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../../lib/useI18n';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
}

const TYPING_TIMEOUT_MS = 2000;

export default function ChatInput({ onSendMessage, onTyping, disabled }: ChatInputProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const stopTyping = () => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onTyping(false);
  };

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSendMessage(message);
    setMessage('');
    stopTyping();
  };

  const handleChange = (text: string) => {
    setMessage(text);

    if (text.length > 0) {
      onTyping(true);
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        typingTimeoutRef.current = null;
        onTyping(false);
      }, TYPING_TIMEOUT_MS);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="dm-input">
      <textarea
        className="dm-input__field"
        placeholder={t('chatInput.placeholder')}
        value={message}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={500}
        rows={1}
        disabled={disabled}
        aria-label="Message"
      />
      <button
        type="button"
        className={canSend ? 'dm-input__send' : 'dm-input__send dm-input__send--disabled'}
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send"
      >
        ➤
      </button>
    </div>
  );
}
