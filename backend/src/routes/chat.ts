import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getOrCreateChat, sendMessage, getMessages, markMessagesAsRead } from '../services/chat';

const router = express.Router();

// POST /chat - create or get chat for a match
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { matchId, otherUserId } = req.body;
    const userId = (req as any).userId;

    if (!matchId || !otherUserId) {
      return res.status(400).json({ error: 'matchId and otherUserId required' });
    }

    const chat = await getOrCreateChat(matchId, userId, otherUserId);
    return res.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Failed to create chat' });
  }
});

// POST /chat/:chatId/message - send message
router.post('/:chatId/message', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const userId = (req as any).userId;

    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }

    const message = await sendMessage(chatId, userId, text);
    return res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /chat/:chatId/messages - get chat messages
router.get('/:chatId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await getMessages(chatId, limit);
    return res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /chat/:chatId/read - mark messages as read
router.post('/:chatId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = (req as any).userId;

    await markMessagesAsRead(chatId, userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

export default router;
