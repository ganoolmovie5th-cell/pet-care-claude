import { Router, Request, Response } from 'express';
import {
  sendBookingConfirmation,
  sendPaymentReceipt,
  sendSubscriptionReminder,
  sendSubscriptionOverdue,
} from '../services/email';

const router = Router();

router.post('/booking-confirmation', async (req: Request, res: Response) => {
  const { ownerId, ownerEmail, booking } = req.body;
  if (!ownerId || !ownerEmail || !booking) {
    return res.status(400).json({ error: 'ownerId, ownerEmail, and booking are required' });
  }
  await sendBookingConfirmation(ownerId, ownerEmail, booking);
  return res.json({ success: true });
});

router.post('/payment-receipt', async (req: Request, res: Response) => {
  const { vetEmail, invoice } = req.body;
  if (!vetEmail || !invoice) {
    return res.status(400).json({ error: 'vetEmail and invoice are required' });
  }
  await sendPaymentReceipt(vetEmail, invoice);
  return res.json({ success: true });
});

router.post('/subscription-reminder', async (req: Request, res: Response) => {
  const { vetEmail, vetName, daysUntilExpiry } = req.body;
  if (!vetEmail || !vetName || daysUntilExpiry == null) {
    return res.status(400).json({ error: 'vetEmail, vetName, and daysUntilExpiry are required' });
  }
  await sendSubscriptionReminder(vetEmail, vetName, daysUntilExpiry);
  return res.json({ success: true });
});

router.post('/subscription-overdue', async (req: Request, res: Response) => {
  const { vetEmail, vetName } = req.body;
  if (!vetEmail || !vetName) {
    return res.status(400).json({ error: 'vetEmail and vetName are required' });
  }
  await sendSubscriptionOverdue(vetEmail, vetName);
  return res.json({ success: true });
});

export default router;
