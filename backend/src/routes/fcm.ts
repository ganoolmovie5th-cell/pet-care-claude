import express, { Router, Request, Response } from 'express';
import {
  registerFCMToken,
  getUserNotifications,
  markNotificationAsRead,
} from '../services/notifications';
import { authenticateToken } from '../middleware/auth';
import { db } from '../config/firebase';

const router: Router = express.Router();

router.use(authenticateToken);

interface RegisterTokenRequest {
  token: string;
  device: 'iOS' | 'Android';
}

// POST /fcm/register-token — Register FCM token
router.post('/register-token', async (req: Request, res: Response) => {
  try {
    const { token, device } = req.body as RegisterTokenRequest;

    if (!token || !device) {
      return res.status(400).json({ error: 'Missing required fields: token, device' });
    }

    const tokenId = await registerFCMToken(req.userId!, token, device);
    return res.status(201).json({ id: tokenId, message: 'Token registered' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ error: 'Failed to register token' });
  }
});

// GET /fcm/notifications — Get user notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { unreadOnly = 'false', limit = '20', offset = '0' } = req.query;

    const result = await getUserNotifications(
      req.userId!,
      unreadOnly === 'true',
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /fcm/notifications/:notificationId/read — Mark notification as read
router.patch('/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    const doc = await db.collection('user_notifications').doc(notificationId).get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await markNotificationAsRead(notificationId);
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
