/**
 * React i18n provider — same keys/behavior as the mobile `useTranslation`
 * hook (src/i18n/index.js), backed by the shared dictionary and persisted
 * under the mobile-compatible `chatti_language` storage key.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { LanguageCode } from '@shared/i18n/translations';
import { SUPPORTED_LANGUAGES, localeFor, translate } from '@shared/i18n/translations';
import { LocalStorageAdapter, STORAGE_KEYS } from '@shared/storage/StorageAdapter';
import { I18nContext } from './i18nContext';
import type { I18nContextValue } from './i18nContext';

const storage = new LocalStorageAdapter();

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    let active = true;
    storage.getItem(STORAGE_KEYS.language).then((saved) => {
      if (active && saved && (SUPPORTED_LANGUAGES as string[]).includes(saved)) {
        setLanguageState(saved as LanguageCode);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    void storage.setItem(STORAGE_KEYS.language, next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
      locale: localeFor(language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
