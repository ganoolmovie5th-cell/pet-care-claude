import express, { Router, Request, Response } from 'express';
import { logEvent, getDailyMetrics, getMetricsRange, logAnalyticsEvent } from '../services/analytics';
import { enqueueAnalyticsTask } from '../queues/analyticsQueue';

const router: Router = express.Router();

const VALID_EVENT_TYPES = ['app_opened', 'booking_created', 'payment_completed', 'vet_viewed', 'dispute_opened'];
const CRITICAL_EVENT_TYPES = ['payment_completed', 'dispute_opened'];

router.post('/event', async (req: Request, res: Response) => {
  try {
    const { eventType, userId, vetId, metadata } = req.body;

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const eventId = await logAnalyticsEvent({ eventType, userId, vetId, metadata });

    if (CRITICAL_EVENT_TYPES.includes(eventType)) {
      await enqueueAnalyticsTask(eventId, eventType);
    }

    return res.json({ success: true, eventId });
  } catch (error) {
    console.error('Error logging event:', error);
    return res.status(500).json({ error: 'Failed to log event' });
  }
});

router.get('/metrics/daily/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const metrics = await getDailyMetrics(date);
    return res.json(metrics);
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/metrics/range', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing startDate or endDate' });
    }

    const metrics = await getMetricsRange(startDate as string, endDate as string);
    return res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics range:', error);
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.post('/insurance-click', async (req: Request, res: Response) => {
  try {
    const { userId, providerName } = req.body;

    if (!userId || !providerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await logEvent(userId, 'insurance_clicked', { providerName });
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error logging insurance click:', error);
    return res.status(500).json({ error: 'Failed to log click' });
  }
});

export default router;
