/**
 * Contacts section — placeholder for the mobile ContactsScreen port.
 * The P0 task list does not include the contacts feature; the page is a
 * nav destination until a later iteration implements it.
 */

import { useI18n } from '../../lib/useI18n';

export default function ContactsPage() {
  const { t } = useI18n();
  return (
    <section className="section">
      <h1 className="section__title">{t('tabs.contacts')}</h1>
      <p className="section__hint">👥 {t('tabs.contacts')} — coming soon</p>
    </section>
  );
}
