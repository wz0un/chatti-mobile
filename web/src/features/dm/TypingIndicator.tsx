/**
 * Typing indicator — port of `src/components/TypingIndicator.js`.
 */

import { useI18n } from '../../lib/useI18n';

interface TypingIndicatorProps {
  usernames: string[];
}

export default function TypingIndicator({ usernames }: TypingIndicatorProps) {
  const { t } = useI18n();

  if (!usernames || usernames.length === 0) {
    return null;
  }

  const usernamesText = usernames.join(', ');
  const text =
    usernames.length > 1
      ? t('typing.plural', { users: usernamesText })
      : t('typing.singular', { users: usernamesText });

  return (
    <div className="typing">
      <span className="typing__text">{text}</span>
      <span className="typing__dots">
        <span className="typing__dot" />
        <span className="typing__dot" />
        <span className="typing__dot" />
      </span>
    </div>
  );
}
