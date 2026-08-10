/**
 * App root — routing + session gate.
 * `/login` renders the auth page; everything else requires a logged-in
 * user (session restored from the shared `userData` storage key).
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import type { User } from '@shared/types';
import authService from '@shared/auth/AuthService';
import LoginPage from '../features/auth/LoginPage';

import './app.css';

type SessionState =
  | { status: 'loading' }
  | { status: 'logged-out' }
  | { status: 'logged-in'; user: User };

export default function App() {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then((user) => {
      if (!active) return;
      setSession(user ? { status: 'logged-in', user } : { status: 'logged-out' });
    });
    return () => {
      active = false;
    };
  }, []);

  if (session.status === 'loading') {
    return (
      <div className="app-boot">
        <p className="app-boot__title">Chat-Ti</p>
      </div>
    );
  }

  const onAuthenticated = (user: User) => {
    setSession({ status: 'logged-in', user });
  };

  const onLogout = async () => {
    await authService.logout();
    setSession({ status: 'logged-out' });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session.status === 'logged-in' ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onAuthenticated={onAuthenticated} />
            )
          }
        />
        <Route
          path="*"
          element={
            session.status === 'logged-out' ? (
              <Navigate to="/login" replace />
            ) : (
              // Task 8 replaces this placeholder with the app shell
              <HomePlaceholder user={session.user} onLogout={onLogout} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function HomePlaceholder({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="app-splash">
      <h1 className="app-splash__title">Chat-Ti</h1>
      <p className="app-splash__subtitle">Logged in as {user.fullUsername}</p>
      <button type="button" className="app-placeholder__logout" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
