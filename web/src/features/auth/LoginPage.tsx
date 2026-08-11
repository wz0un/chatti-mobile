/**
 * Login/Register page — port of `src/screens/LoginScreen.js`.
 * Same tabs, validation messages and flows (register auto-navigates
 * after 3s like mobile).
 */

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { User } from '@shared/types';
import authService from '@shared/auth/AuthService';
import { useI18n } from '../../lib/useI18n';

import './login.css';

interface LoginPageProps {
  onAuthenticated: (user: User) => void;
}

type Tab = 'login' | 'register';

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [fullUsername, setFullUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const registerTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (registerTimer.current !== null) {
        window.clearTimeout(registerTimer.current);
      }
    };
  }, []);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessInfo('');
  };

  const handleLogin = async () => {
    const trimmedUsername = fullUsername.trim();
    const trimmedPassword = password.trim();

    setError('');
    setSuccessInfo('');

    if (!trimmedUsername) {
      setError(t('login.errors.empty'));
      return;
    }

    if (!trimmedUsername.includes('#')) {
      setError(t('login.errors.invalidFormat'));
      return;
    }

    if (!trimmedPassword) {
      setError(t('login.errors.emptyPassword'));
      return;
    }

    try {
      setLoading(true);
      const user = await authService.loginUser(trimmedUsername, trimmedPassword);

      if (!user) {
        throw new Error(t('login.errors.noUser'));
      }

      onAuthenticated(user);
    } catch (err) {
      console.error('Error during login:', err);
      setError((err as Error).message || t('login.errors.server'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    setError('');
    setSuccessInfo('');

    if (!trimmedUsername) {
      setError(t('login.errors.nameRequired'));
      return;
    }

    if (!trimmedPassword) {
      setError(t('login.errors.passwordRequired'));
      return;
    }

    if (trimmedPassword.length < 6) {
      setError(t('login.errors.passwordTooShort'));
      return;
    }

    try {
      setLoading(true);
      const user = await authService.registerUser(trimmedUsername, trimmedPassword);

      if (!user) {
        throw new Error(t('login.errors.noUser'));
      }

      setSuccessInfo(t('login.success.register', { username: user.fullUsername }));

      registerTimer.current = window.setTimeout(() => {
        onAuthenticated(user);
      }, 3000);
    } catch (err) {
      console.error('Error during registration:', err);
      setError((err as Error).message || t('login.errors.registerError'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (activeTab === 'login') {
      void handleLogin();
    } else {
      void handleRegister();
    }
  };

  const loginDisabled = !fullUsername.trim() || !password.trim() || loading;
  const registerDisabled = !username.trim() || !password.trim() || loading;

  return (
    <div className="login">
      <div className="login__content">
        <header className="login__header">
          <h1 className="login__title">{t('login.title')}</h1>
          <p className="login__subtitle">{t('login.subtitle')}</p>
        </header>

        <div className="login__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            className={activeTab === 'login' ? 'login__tab login__tab--active' : 'login__tab'}
            onClick={() => switchTab('login')}
          >
            {t('login.tabLogin')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            className={activeTab === 'register' ? 'login__tab login__tab--active' : 'login__tab'}
            onClick={() => switchTab('register')}
          >
            {t('login.tabRegister')}
          </button>
        </div>

        <form className="login__form" onSubmit={onSubmit}>
          {activeTab === 'login' ? (
            <>
              <label className="login__label" htmlFor="login-username">
                {t('login.usernameFullLabel')}
              </label>
              <input
                id="login-username"
                className="login__input"
                type="text"
                placeholder={t('login.usernameFullPlaceholder')}
                value={fullUsername}
                onChange={(event) => setFullUsername(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />

              <label className="login__label" htmlFor="login-password">
                {t('login.passwordLabel')}
              </label>
              <input
                id="login-password"
                className="login__input"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />

              {error && <p className="login__error">{error}</p>}

              <button
                type="submit"
                className={loginDisabled ? 'login__button login__button--disabled' : 'login__button'}
                disabled={loginDisabled}
              >
                {loading ? t('common.loading') : t('login.join')}
              </button>
            </>
          ) : (
            <>
              <label className="login__label" htmlFor="register-username">
                {t('login.usernameLabel')}
              </label>
              <input
                id="register-username"
                className="login__input"
                type="text"
                placeholder={t('login.usernamePlaceholder')}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />

              <label className="login__label" htmlFor="register-password">
                {t('login.passwordLabel')}
              </label>
              <input
                id="register-password"
                className="login__input"
                type="password"
                placeholder={t('login.passwordMinPlaceholder')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />

              {error && <p className="login__error">{error}</p>}
              {successInfo && <p className="login__success">{successInfo}</p>}

              <button
                type="submit"
                className={registerDisabled ? 'login__button login__button--disabled' : 'login__button'}
                disabled={registerDisabled}
              >
                {loading ? t('common.loading') : t('login.createAccount')}
              </button>
            </>
          )}
        </form>

        <footer className="login__footer">
          <p className="login__footerText">
            {activeTab === 'login' ? t('login.footerLogin') : t('login.footerRegister')}
          </p>
        </footer>
      </div>
    </div>
  );
}
