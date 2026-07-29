import express from 'express';
import { authenticateToken } from '../middleware/auth';
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
} from '../services/playdate';

const router = express.Router();

// Posts CRUD
router.post('/posts', authenticateToken, async (req, res, next) => {
  try {
    const post = await createPlaydatePost({
      ...req.body,
      ownerId: req.userId!,
      interested_owners: [],
    });
    res.json({ id: post.id, created_at: post.created_at });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:postId', authenticateToken, async (req, res, next) => {
  try {
    const post = await getPlaydatePost(req.params.postId);
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (err) {
    next(err);
  }
});

router.patch('/posts/:postId', authenticateToken, async (req, res, next) => {
  try {
    const post = await getPlaydatePost(req.params.postId);
    if (!post || post.ownerId !== req.userId) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    await updatePlaydatePost(req.params.postId, req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/owner/mine', authenticateToken, async (req, res, next) => {
  try {
    const posts = await getPlaydatePostsByOwner(req.userId!);
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

router.get('/posts/active/all', authenticateToken, async (_req, res, next) => {
  try {
    const posts = await getAllActivePosts();
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// Interest
router.post('/posts/:postId/interested', authenticateToken, async (req, res, next) => {
  try {
    await addInterestedOwner(req.params.postId, req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:postId/interested', authenticateToken, async (req, res, next) => {
  try {
    await removeInterestedOwner(req.params.postId, req.userId!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Chat
router.post('/posts/:postId/chat/start', authenticateToken, async (req, res, next) => {
  try {
    const { interestedOwnerId, initialMessage } = req.body;
    const chat = await createPlaydateChat(
      req.params.postId,
      req.userId!,
      interestedOwnerId,
      initialMessage
    );
    res.json({ id: chat.id, created_at: chat.created_at });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:postId/chat', authenticateToken, async (req, res, next) => {
  try {
    const chats = await getPlaydateChatsByPost(req.params.postId);
    res.json(chats);
  } catch (err) {
    next(err);
  }
});

router.get('/chat/:chatId', authenticateToken, async (req, res, next) => {
  try {
    const chat = await getPlaydateChat(req.params.chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json(chat);
  } catch (err) {
    next(err);
  }
});

router.post('/chat/:chatId/message', authenticateToken, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }
    await addMessageToChat(req.params.chatId, req.userId!, text);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
