/**
 * Rooms page — port of `src/screens/RoomListScreen.js`.
 * Paginated room list, create-room modal, refresh.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Room, User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import { useI18n } from '../../lib/useI18n';

import './rooms.css';

interface RoomsPageProps {
  user: User;
}

export default function RoomsPage({ user }: RoomsPageProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadRooms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError('');
      const data = await ApiService.listRooms(null, 20);
      setRooms(data.rooms);
      cursorRef.current = data.cursor;
      hasMoreRef.current = data.hasMore;
    } catch {
      setError(t('rooms.errors.load'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMore) return;
    try {
      setLoadingMore(true);
      const data = await ApiService.listRooms(cursorRef.current, 20);
      setRooms((prev) => [...prev, ...data.rooms]);
      cursorRef.current = data.cursor;
      hasMoreRef.current = data.hasMore;
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  useEffect(() => {
    void (async () => {
      await loadRooms();
    })();
  }, [loadRooms]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        void loadMore();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  const handleRefresh = () => {
    void loadRooms(true);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setCreateError(t('rooms.errors.nameRequired'));
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const room = await ApiService.createRoom(name, user.fullUsername);
      setRooms((prev) => [room, ...prev]);
      setModalOpen(false);
      setNewName('');
    } catch {
      setCreateError(t('rooms.errors.create'));
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(navigator.language, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <section className="section">
      <div className="rooms__header">
        <div className="rooms__headerText">
          <p className="rooms__welcome">{t('rooms.welcome', { name: user.fullUsername })}</p>
        </div>
        <div className="rooms__avatar">
          {user.fullUsername.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="rooms__toolbar">
        <button
          type="button"
          className="rooms__createBtn"
          onClick={() => { setModalOpen(true); setCreateError(''); }}
        >
          {t('rooms.createButton')}
        </button>
        <button
          type="button"
          className="rooms__refreshBtn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          ↻
        </button>
      </div>

      {error && (
        <div className="rooms__center">
          <p className="rooms__error">{error}</p>
          <button type="button" className="rooms__retryBtn" onClick={handleRefresh}>↻ Retry</button>
        </div>
      )}

      {!error && (
        <div className="rooms__list" ref={listRef}>
          {loading && !refreshing ? (
            <div className="rooms__center">
              <p className="rooms__loading">{t('rooms.loading')}</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="rooms__center">
              <p className="rooms__emptyIcon">🏠</p>
              <p className="rooms__emptyTitle">{t('rooms.emptyTitle')}</p>
              <p className="rooms__emptySubtitle">{t('rooms.emptySubtitle')}</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="rooms__card"
                onClick={() => navigate(`/room/${room.id}`, { state: { roomName: room.name } })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/room/${room.id}`, { state: { roomName: room.name } });
                  }
                }}
              >
                <div className="rooms__cardHeader">
                  <span className="rooms__cardName">{room.name}</span>
                  {room.isPrivate && (
                    <span className="rooms__privateBadge">{t('rooms.private')}</span>
                  )}
                </div>
                <div className="rooms__cardFooter">
                  <span className="rooms__cardOwner">{t('rooms.createdBy', { owner: room.owner })}</span>
                  <span className="rooms__cardDate">{formatDate(room.createdAt)}</span>
                </div>
              </div>
            ))
          )}

          {loadingMore && <p className="rooms__loadingMore">{t('rooms.loading')}</p>}
        </div>
      )}

      {refreshing && <p className="rooms__refreshing">{t('rooms.loading')}</p>}

      <button
        type="button"
        className="rooms__fab"
        onClick={() => { setModalOpen(true); setCreateError(''); }}
      >
        +
      </button>

      {modalOpen && (
        <div className="rooms__modal">
          <div className="rooms__modalContent">
            <h2 className="rooms__modalTitle">{t('rooms.modalTitle')}</h2>
            <input
              type="text"
              className="rooms__modalInput"
              placeholder={t('rooms.inputPlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
              autoFocus
              maxLength={50}
              disabled={creating}
            />
            {createError && <p className="rooms__modalError">{createError}</p>}
            <div className="rooms__modalActions">
              <button
                type="button"
                className="rooms__modalCancel"
                onClick={() => { setModalOpen(false); setNewName(''); }}
                disabled={creating}
              >
                {t('rooms.cancel')}
              </button>
              <button
                type="button"
                className="rooms__modalConfirm"
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
              >
                {creating ? '...' : t('rooms.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
