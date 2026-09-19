/**
 * Web Push payload schema tests — Task 22.
 * Covers the shared payload contract + deep-link routing the Service Worker
 * applies on notification clicks.
 */

import { parsePushPayload, notificationUrlFor } from './webPush';

describe('notificationUrlFor', () => {
  it('deep-links room notifications to /room/:roomId', () => {
    expect(notificationUrlFor({ title: '💬 alice', data: { kind: 'room', roomId: 'r1' } })).toBe(
      '/room/r1',
    );
  });

  it('deep-links dm notifications to /dm/:conversationId', () => {
    expect(
      notificationUrlFor({ title: '🔒 alice#1', data: { kind: 'dm', conversationId: 'dm_x_v2' } }),
    ).toBe('/dm/dm_x_v2');
  });

  it('falls back to /rooms without routing data', () => {
    expect(notificationUrlFor({ title: 'no data' })).toBe('/rooms');
  });

  it('prefers an explicit url override', () => {
    expect(notificationUrlFor({ title: 'x', url: '/profile' })).toBe('/profile');
  });
});

describe('parsePushPayload', () => {
  it('parses a valid room payload', () => {
    const parsed = parsePushPayload({
      title: '💬 alice#1234',
      body: 'hello there',
      data: { kind: 'room', roomId: 'r_1' },
    });
    expect(parsed).toEqual({
      title: '💬 alice#1234',
      body: 'hello there',
      data: { kind: 'room', roomId: 'r_1' },
    });
  });

  it('parses a valid DM payload with the partner id', () => {
    const parsed = parsePushPayload({
      title: '🔒 bob',
      data: { kind: 'dm', conversationId: 'dm_1_v2', conversationPartnerId: 'u2' },
    });
    expect(parsed?.data).toEqual({
      kind: 'dm',
      conversationId: 'dm_1_v2',
      conversationPartnerId: 'u2',
    });
  });

  it('returns null for junk payloads without a title', () => {
    expect(parsePushPayload(null)).toBeNull();
    expect(parsePushPayload(42)).toBeNull();
    expect(parsePushPayload({ body: 'no title here' })).toBeNull();
  });

  it('strips unknown data fields', () => {
    const parsed = parsePushPayload({ title: 't', data: { kind: 'room', evil: 'x' } });
    expect(parsed?.data).toEqual({ kind: 'room' });
  });
});