/**
 * App shell — responsive layout (Task 8 spec):
 * Desktop (≥1024px): fixed 320px sidebar + content pane.
 * Tablet (768–1024px): collapsible sidebar.
 * Mobile (<768px): single pane + bottom nav; chat opens full-screen.
 */

import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import type { User } from '@shared/types';
import { useI18n } from '../lib/useI18n';
import { useSectionBadges } from '../lib/useSectionBadges';

import './appShell.css';

interface AppShellProps {
  user: User;
}

export default function AppShell({ user }: AppShellProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { unreadChats, pendingRequests } = useSectionBadges(user);

  const inChat = pathname.startsWith('/dm/');

  const navItems = [
    { to: '/rooms', emoji: '🏠', label: t('tabs.rooms'), badge: null },
    { to: '/chats', emoji: '💬', label: t('tabs.chats'), badge: unreadChats },
    { to: '/contacts', emoji: '👥', label: t('tabs.contacts'), badge: pendingRequests },
    { to: '/profile', emoji: '⚙️', label: t('tabs.profile'), badge: null },
  ];

  return (
    <div className="shell">
      <aside className={sidebarOpen ? 'shell__sidebar shell__sidebar--open' : 'shell__sidebar'}>
        <div className="shell__brand">Chat-Ti</div>

        <nav className="shell__nav" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'shell__navItem shell__navItem--active' : 'shell__navItem'
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="shell__navEmoji">{item.emoji}</span>
              <span className="shell__navLabel">{item.label}</span>
              {item.badge !== null && item.badge > 0 && (
                <span className="shell__badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shell__sidebarFooter">
          <span className="shell__sidebarUser">{user.fullUsername}</span>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="shell__backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className={inChat ? 'shell__main shell__main--chat' : 'shell__main'}>
        {!inChat && (
          <button
            type="button"
            className="shell__menuButton"
            aria-label="Toggle menu"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
        )}
        <Outlet />
      </main>

      {!inChat && (
        <nav className="shell__bottomNav" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'shell__bottomItem shell__bottomItem--active' : 'shell__bottomItem'
              }
            >
              <span className="shell__bottomEmojiWrap">
                <span className="shell__bottomEmoji">{item.emoji}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="shell__badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </span>
              <span className="shell__bottomLabel">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
