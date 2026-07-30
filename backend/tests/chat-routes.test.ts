import request from 'supertest';

jest.mock('../src/config/firebase', () => ({
  db: { collection: jest.fn() },
  auth: { verifyIdToken: jest.fn() },
  realtimeDb: {},
  storage: {},
}));

jest.mock('../src/services/chat', () => ({
  getOrCreateChat: jest.fn(),
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  markMessagesAsRead: jest.fn(),
}));

import app from '../src/index';
import { auth } from '../src/config/firebase';
import * as chatService from '../src/services/chat';

const chat = { id: 'chat-1', matchId: 'match-1', participants: ['owner-1', 'owner-2'] };
const message = { id: 'msg-1', chatId: 'chat-1', senderId: 'owner-1', text: 'Halo' };

const asUser = (uid: string) => (auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid });

beforeEach(() => {
  jest.clearAllMocks();
  (chatService.getOrCreateChat as jest.Mock).mockResolvedValue(chat);
  (chatService.sendMessage as jest.Mock).mockResolvedValue(message);
  (chatService.getMessages as jest.Mock).mockResolvedValue([message]);
});

describe('POST /chat', () => {
  it('opens the chat with the caller as the first participant', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer owner-token')
      .send({ matchId: 'match-1', otherUserId: 'owner-2' });

    expect(res.status).toBe(200);
    expect(chatService.getOrCreateChat).toHaveBeenCalledWith('match-1', 'owner-1', 'owner-2');
  });

  it('rejects a request without otherUserId with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer owner-token')
      .send({ matchId: 'match-1' });

    expect(res.status).toBe(400);
    expect(chatService.getOrCreateChat).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/chat').send({ matchId: 'match-1', otherUserId: 'x' });

    expect(res.status).toBe(401);
    expect(chatService.getOrCreateChat).not.toHaveBeenCalled();
  });
});

describe('POST /chat/:chatId/message', () => {
  it('sends the message as the caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/chat/chat-1/message')
      .set('Authorization', 'Bearer owner-token')
      .send({ text: 'Halo' });

    expect(res.status).toBe(200);
    expect(chatService.sendMessage).toHaveBeenCalledWith('chat-1', 'owner-1', 'Halo');
  });

  it('rejects an empty message with 400', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/chat/chat-1/message')
      .set('Authorization', 'Bearer owner-token')
      .send({});

    expect(res.status).toBe(400);
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/chat/chat-1/message').send({ text: 'Halo' });

    expect(res.status).toBe(401);
    expect(chatService.sendMessage).not.toHaveBeenCalled();
  });
});

describe('GET /chat/:chatId/messages', () => {
  it('defaults the page size to 50', async () => {
    asUser('owner-1');

    const res = await request(app)
      .get('/chat/chat-1/messages')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(chatService.getMessages).toHaveBeenCalledWith('chat-1', 50);
  });

  it('honours the limit from the query string', async () => {
    asUser('owner-1');

    await request(app)
      .get('/chat/chat-1/messages?limit=10')
      .set('Authorization', 'Bearer owner-token');

    expect(chatService.getMessages).toHaveBeenCalledWith('chat-1', 10);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).get('/chat/chat-1/messages');

    expect(res.status).toBe(401);
    expect(chatService.getMessages).not.toHaveBeenCalled();
  });
});

describe('POST /chat/:chatId/read', () => {
  it('marks the messages read for the caller', async () => {
    asUser('owner-1');

    const res = await request(app)
      .post('/chat/chat-1/read')
      .set('Authorization', 'Bearer owner-token');

    expect(res.status).toBe(200);
    expect(chatService.markMessagesAsRead).toHaveBeenCalledWith('chat-1', 'owner-1');
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const res = await request(app).post('/chat/chat-1/read');

    expect(res.status).toBe(401);
    expect(chatService.markMessagesAsRead).not.toHaveBeenCalled();
  });
});
