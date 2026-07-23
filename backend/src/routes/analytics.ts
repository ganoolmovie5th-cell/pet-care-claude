import express, { Router, Request, Response } from 'express';
import { logEvent, getDailyMetrics, getMetricsRange } from '../services/analytics';

const router: Router = express.Router();

router.post('/event', async (req: Request, res: Response) => {
  try {
    const { userId, eventType, metadata } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const eventId = await logEvent(userId, eventType, metadata);
    return res.status(201).json({ id: eventId });
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
