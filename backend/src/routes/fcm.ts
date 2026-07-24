import express, { Router, Request, Response } from 'express';
import {
  registerFCMToken,
  getUserNotifications,
  markNotificationAsRead,
} from '../services/notifications';

const router: Router = express.Router();

interface RegisterTokenRequest {
  userId: string;
  token: string;
  device: 'iOS' | 'Android';
}

// POST /fcm/register-token — Register FCM token
router.post('/register-token', async (req: Request, res: Response) => {
  try {
    const { userId, token, device } = req.body as RegisterTokenRequest;

    if (!userId || !token || !device) {
      return res.status(400).json({ error: 'Missing required fields: userId, token, device' });
    }

    const tokenId = await registerFCMToken(userId, token, device);
    return res.status(201).json({ id: tokenId, message: 'Token registered' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ error: 'Failed to register token' });
  }
});

// GET /fcm/notifications — Get user notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, unreadOnly = 'false', limit = '20', offset = '0' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const result = await getUserNotifications(
      userId as string,
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

    await markNotificationAsRead(notificationId);
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
