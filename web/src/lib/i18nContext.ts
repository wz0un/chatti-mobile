/**
 * i18n context — shared between I18nProvider and useI18n (split for
 * react-refresh/only-export-components).
 */

import { createContext } from 'react';

import type { LanguageCode, TranslationParams } from '@shared/i18n/translations';

export interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: TranslationParams) => string;
  locale: string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
