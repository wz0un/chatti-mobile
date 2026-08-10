/**
 * Conversations section — Task 9 replaces this placeholder with the real
 * conversation list (fetch, dedupe/sort, search, unread dots, delete).
 */

import { useI18n } from '../../lib/useI18n';

export default function ConversationsPage() {
  const { t } = useI18n();
  return (
    <section className="section">
      <h1 className="section__title">{t('tabs.chats')}</h1>
      <p className="section__hint">💬 {t('tabs.chats')} — coming soon</p>
    </section>
  );
}
