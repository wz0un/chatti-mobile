/**
 * useI18n hook — access translations from the I18nProvider.
 */

import { useContext } from 'react';

import { I18nContext } from './i18nContext';
import type { I18nContextValue } from './i18nContext';

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
