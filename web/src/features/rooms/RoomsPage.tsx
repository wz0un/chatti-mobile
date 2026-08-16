/**
 * Rooms section — placeholder for the mobile RoomListScreen port.
 * The P0 task list does not include the rooms feature; the page is a
 * nav destination until a later iteration implements it.
 */

import { useI18n } from '../../lib/useI18n';

export default function RoomsPage() {
  const { t } = useI18n();
  return (
    <section className="section">
      <h1 className="section__title">{t('tabs.rooms')}</h1>
      <p className="section__hint">🏠 {t('tabs.rooms')} — coming soon</p>
    </section>
  );
}
