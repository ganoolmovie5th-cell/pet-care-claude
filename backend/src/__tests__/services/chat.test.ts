import {
  getOrCreateChat,
  sendMessage,
  getMessages,
  markMessagesAsRead,
} from '../../services/chat';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

const fake = db as unknown as FakeFirestore;

// The fake flattens subcollections into "chats/<id>/messages".
const messagesOf = (chatId: string) => `chats/${chatId}/messages`;

const message = (over: Record<string, unknown> = {}) => ({
  chatId: 'chat-1',
  senderId: 'owner-1',
  text: 'Hi',
  timestamp: '2026-07-20T10:00:00.000Z',
  read: false,
  ...over,
});

describe('Chat Service', () => {
  beforeEach(() => {
    fake.reset();
  });

  describe('getOrCreateChat', () => {
    it('creates a chat with both participants and returns its id', async () => {
      const chat = await getOrCreateChat('match-1', 'owner-1', 'owner-2');

      expect(chat.id).toBeTruthy();
      expect(chat.participants).toEqual(['owner-1', 'owner-2']);
      expect(chat.matchId).toBe('match-1');
      expect(Date.parse(chat.createdAt)).not.toBeNaN();
      expect(fake.count('chats')).toBe(1);
    });

    it('returns the existing chat instead of creating a second one', async () => {
      const first = await getOrCreateChat('match-1', 'owner-1', 'owner-2');
      const second = await getOrCreateChat('match-1', 'owner-1', 'owner-2');

      expect(second.id).toBe(first.id);
      expect(fake.count('chats')).toBe(1);
    });

    it('creates a separate chat for a different match', async () => {
      const a = await getOrCreateChat('match-1', 'owner-1', 'owner-2');
      const b = await getOrCreateChat('match-2', 'owner-1', 'owner-2');

      expect(b.id).not.toBe(a.id);
      expect(fake.count('chats')).toBe(2);
    });

    // The lookup filters on userId1 with array-contains, and either participant
    // is in that array, so reaching the same match from the other side reuses it.
    it('finds the same chat when looked up from the second participant', async () => {
      const first = await getOrCreateChat('match-1', 'owner-1', 'owner-2');
      const fromOther = await getOrCreateChat('match-1', 'owner-2', 'owner-1');

      expect(fromOther.id).toBe(first.id);
      expect(fake.count('chats')).toBe(1);
    });
  });

  describe('sendMessage', () => {
    it('stores the message unread and mirrors it onto the parent chat', async () => {
      const chat = await getOrCreateChat('match-1', 'owner-1', 'owner-2');

      const msg = await sendMessage(chat.id, 'owner-1', 'Sounds good');

      expect(msg.id).toBeTruthy();
      expect(msg.read).toBe(false);
      expect(Date.parse(msg.timestamp)).not.toBeNaN();
      expect(fake.raw(messagesOf(chat.id), msg.id)).toMatchObject({
        senderId: 'owner-1',
        text: 'Sounds good',
      });

      const parent = fake.raw('chats', chat.id) as Record<string, string>;
      expect(parent.lastMessage).toBe('Sounds good');
      expect(Date.parse(parent.lastMessageTime)).not.toBeNaN();
    });

    it('overwrites lastMessage with the most recent text', async () => {
      const chat = await getOrCreateChat('match-1', 'owner-1', 'owner-2');

      await sendMessage(chat.id, 'owner-1', 'First');
      await sendMessage(chat.id, 'owner-2', 'Second');

      expect(fake.raw('chats', chat.id)).toMatchObject({ lastMessage: 'Second' });
    });

    it('stores no id field, so the message keeps its id when read back', async () => {
      const chat = await getOrCreateChat('match-1', 'owner-1', 'owner-2');
      const sent = await sendMessage(chat.id, 'owner-1', 'Hello');

      expect(fake.raw(messagesOf(chat.id), sent.id)).not.toHaveProperty('id');
      const [readBack] = await getMessages(chat.id);
      expect(readBack.id).toBe(sent.id);
    });
  });

  describe('getMessages', () => {
    it('returns messages newest first', async () => {
      fake.seed(messagesOf('chat-1'), {
        'm-old': message({ timestamp: '2026-07-20T09:00:00.000Z', text: 'Old' }),
        'm-new': message({ timestamp: '2026-07-20T11:00:00.000Z', text: 'New' }),
      });

      const messages = await getMessages('chat-1');
      expect(messages.map(m => m.text)).toEqual(['New', 'Old']);
      expect(messages[0].id).toBe('m-new');
    });

    it('respects the limit', async () => {
      fake.seed(messagesOf('chat-1'), {
        'm-1': message({ timestamp: '2026-07-20T09:00:00.000Z' }),
        'm-2': message({ timestamp: '2026-07-20T10:00:00.000Z' }),
        'm-3': message({ timestamp: '2026-07-20T11:00:00.000Z' }),
      });

      const messages = await getMessages('chat-1', 2);
      expect(messages.map(m => m.id)).toEqual(['m-3', 'm-2']);
    });

    it('returns an empty array for a chat with no messages', async () => {
      await expect(getMessages('chat-empty')).resolves.toEqual([]);
    });
  });

  describe('markMessagesAsRead', () => {
    it('marks only unread messages from the other participant', async () => {
      fake.seed(messagesOf('chat-1'), {
        theirs: message({ senderId: 'owner-2', read: false }),
        'theirs-already-read': message({ senderId: 'owner-2', read: true }),
        mine: message({ senderId: 'owner-1', read: false }),
      });

      await markMessagesAsRead('chat-1', 'owner-1');

      expect(fake.raw(messagesOf('chat-1'), 'theirs')).toMatchObject({ read: true });
      expect(fake.raw(messagesOf('chat-1'), 'theirs-already-read')).toMatchObject({ read: true });
      expect(fake.raw(messagesOf('chat-1'), 'mine')).toMatchObject({ read: false });
    });

    it('is a no-op when there is nothing unread', async () => {
      await expect(markMessagesAsRead('chat-empty', 'owner-1')).resolves.toBeUndefined();
    });
  });
});
