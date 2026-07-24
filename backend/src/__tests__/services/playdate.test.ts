import {
  createPlaydatePost,
  getPlaydatePost,
  updatePlaydatePost,
  getPlaydatePostsByOwner,
  getAllActivePosts,
  addInterestedOwner,
  removeInterestedOwner,
  createPlaydateChat,
  getPlaydateChatsByPost,
  getPlaydateChat,
  addMessageToChat,
} from '../../services/playdate';
import { PlaydatePost, PlaydateChat } from '../../types/playdate';

describe('Playdate Service', () => {
  let testPost: PlaydatePost;
  let testChat: PlaydateChat;

  beforeAll(async () => {
    // Clean test data before running
  });

  describe('Posts CRUD', () => {
    it('should create a playdate post', async () => {
      const postData: Omit<PlaydatePost, 'id' | 'created_at' | 'updated_at'> = {
        ownerId: 'owner-123',
        petId: 'pet-456',
        petName: 'Buddy',
        breed: 'Golden Retriever',
        age: 3,
        location: {
          lat: -6.2088,
          lng: 106.8456,
          address: 'Senayan, Jakarta',
        },
        date: '2026-08-01',
        description: 'Looking for playmates for my dog',
        interested_owners: [],
        status: 'active',
      };

      testPost = await createPlaydatePost(postData);
      expect(testPost.id).toBeDefined();
      expect(testPost.ownerId).toBe('owner-123');
      expect(testPost.status).toBe('active');
      expect(testPost.created_at).toBeDefined();
    });

    it('should get a playdate post by ID', async () => {
      const post = await getPlaydatePost(testPost.id);
      expect(post).toBeDefined();
      expect(post?.id).toBe(testPost.id);
      expect(post?.petName).toBe('Buddy');
    });

    it('should update a playdate post', async () => {
      await updatePlaydatePost(testPost.id, {
        description: 'Updated description',
      });

      const updated = await getPlaydatePost(testPost.id);
      expect(updated?.description).toBe('Updated description');
      expect(updated?.updated_at).toBeDefined();
    });

    it('should get posts by owner', async () => {
      const posts = await getPlaydatePostsByOwner('owner-123');
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0].ownerId).toBe('owner-123');
    });

    it('should get all active posts', async () => {
      const posts = await getAllActivePosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.every(p => p.status === 'active')).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Interested Owners', () => {
    it('should add interested owner to post', async () => {
      await addInterestedOwner(testPost.id, 'interested-owner-789');
      const updated = await getPlaydatePost(testPost.id);
      expect(updated?.interested_owners).toContain('interested-owner-789');
    });

    it('should not add duplicate interested owner', async () => {
      await addInterestedOwner(testPost.id, 'interested-owner-789');
      const updated = await getPlaydatePost(testPost.id);
      const count = updated?.interested_owners.filter(id => id === 'interested-owner-789').length;
      expect(count).toBe(1);
    });

    it('should remove interested owner from post', async () => {
      await removeInterestedOwner(testPost.id, 'interested-owner-789');
      const updated = await getPlaydatePost(testPost.id);
      expect(updated?.interested_owners).not.toContain('interested-owner-789');
    });

    it('should throw error adding interested owner to non-existent post', async () => {
      await expect(
        addInterestedOwner('non-existent-id', 'some-owner')
      ).rejects.toThrow();
    });
  });

  describe('Chat CRUD', () => {
    it('should create playdate chat', async () => {
      const chatData = await createPlaydateChat(
        testPost.id,
        'owner-123',
        'interested-owner-789',
        'Hi! I would love to meet!'
      );

      testChat = chatData;
      expect(testChat.id).toBeDefined();
      expect(testChat.postId).toBe(testPost.id);
      expect(testChat.ownerId).toBe('owner-123');
      expect(testChat.interestedOwnerId).toBe('interested-owner-789');
      expect(testChat.messages.length).toBe(1);
      expect(testChat.messages[0].text).toBe('Hi! I would love to meet!');
    });

    it('should get chat by ID', async () => {
      const chat = await getPlaydateChat(testChat.id);
      expect(chat).toBeDefined();
      expect(chat?.id).toBe(testChat.id);
      expect(chat?.messages.length).toBe(1);
    });

    it('should get chats by post', async () => {
      const chats = await getPlaydateChatsByPost(testPost.id);
      expect(Array.isArray(chats)).toBe(true);
      expect(chats.length).toBeGreaterThan(0);
      expect(chats[0].postId).toBe(testPost.id);
    });

    it('should add message to chat', async () => {
      await addMessageToChat(testChat.id, 'interested-owner-789', 'I am available on Friday!');
      const updated = await getPlaydateChat(testChat.id);

      expect(updated?.messages.length).toBe(2);
      const lastMessage = updated?.messages[updated.messages.length - 1];
      expect(lastMessage?.text).toBe('I am available on Friday!');
      expect(lastMessage?.sender).toBe('interested-owner-789');
    });

    it('should throw error adding message to non-existent chat', async () => {
      await expect(
        addMessageToChat('non-existent-chat-id', 'sender-id', 'message')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle getting non-existent post', async () => {
      const post = await getPlaydatePost('non-existent-post-id');
      expect(post).toBeNull();
    });

    it('should handle getting non-existent chat', async () => {
      const chat = await getPlaydateChat('non-existent-chat-id');
      expect(chat).toBeNull();
    });

    it('should handle empty interested owners list', async () => {
      const postData: Omit<PlaydatePost, 'id' | 'created_at' | 'updated_at'> = {
        ownerId: 'owner-empty-123',
        petId: 'pet-empty-456',
        location: { lat: 0, lng: 0 },
        date: '2026-08-01',
        description: 'No interested owners',
        interested_owners: [],
        status: 'active',
      };

      const post = await createPlaydatePost(postData);
      expect(post.interested_owners).toEqual([]);
    });
  });
});
