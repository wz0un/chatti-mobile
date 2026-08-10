import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './theme/global.css';
import './config';
import App from './app/App';
import { I18nProvider } from './lib/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
