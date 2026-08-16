/**
 * Section badge counts — port of MainTabs checkUnreadChats /
 * checkPendingRequests (30s polling, same unread semantics).
 */

import { useEffect, useState } from 'react';

import type { Conversation, User } from '@shared/types';
import { ApiService } from '@shared/api/ApiService';
import { LocalStorageAdapter, lastSeenKey } from '@shared/storage/StorageAdapter';

const POLL_INTERVAL_MS = 30000;

const storage = new LocalStorageAdapter();

export function useSectionBadges(user: User): {
  unreadChats: number;
  pendingRequests: number;
} {
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const [conversations, requests] = await Promise.all([
          ApiService.getUserConversations(user.userId),
          ApiService.getContactRequests(user.userId),
        ]);

        setPendingRequests(requests?.length ?? 0);

        const lastSeenStr = (await storage.getItem(lastSeenKey(user.userId))) ?? '{}';
        const lastSeen = JSON.parse(lastSeenStr) as Record<string, string>;

        let count = 0;
        if (Array.isArray(conversations)) {
          conversations.forEach((convo: Conversation) => {
            const recipientId =
              convo.recipient?.userId ||
              convo.recipientId ||
              convo.participants?.find(
                (id) => String(id).toLowerCase() !== String(user.userId).toLowerCase(),
              );

            const lastMsgTimestamp =
              (typeof convo.lastMessage === 'object' && convo.lastMessage?.timestamp) ||
              convo.lastMessageTime ||
              convo.createdAt;
            const lastSeenTimestamp = Number(lastSeen[recipientId ?? '']) || 0;

            // Same comparison semantics as mobile: JS coerces both sides to
            // numbers (epoch timestamps compare numerically; ISO strings yield NaN → not unread)
            if (lastMsgTimestamp && Number(lastMsgTimestamp) > lastSeenTimestamp) {
              count++;
            }
          });
        }
        setUnreadChats(count);
      } catch (error) {
        console.error('Error checking badges:', error);
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [user]);

  return { unreadChats, pendingRequests };
}
