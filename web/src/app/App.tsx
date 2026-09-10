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
import AppShell from '../layout/AppShell';
import ConversationsPage from '../features/conversations/ConversationsPage';
import ContactsPage from '../features/contacts/ContactsPage';
import RoomsPage from '../features/rooms/RoomsPage';
import RoomChatPage from '../features/rooms/RoomChatPage';
import ProfilePage from '../features/profile/ProfilePage';
import DirectMessagePage from '../features/dm/DirectMessagePage';

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

  if (session.status === 'logged-out') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onAuthenticated={onAuthenticated} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const user = session.user;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<AppShell user={user} />}>
          <Route index element={<Navigate to="/rooms" replace />} />
          <Route path="rooms" element={<RoomsPage user={user} />} />
          <Route path="chats" element={<ConversationsPage user={user} />} />
          <Route path="contacts" element={<ContactsPage user={user} />} />
          <Route path="profile" element={<ProfilePage user={user} onLogout={onLogout} />} />
          <Route path="room/:roomId" element={<RoomChatPage user={user} />} />
          <Route path="dm/:conversationId" element={<DirectMessagePage user={user} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
