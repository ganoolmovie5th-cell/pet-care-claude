import express, { Router, Request, Response } from 'express';
import { createPaymentInvoice, getInvoiceById, getInvoiceByBookingId, updateInvoiceStatus } from '../services/payment';
import { updatePaymentStatus } from '../services/booking';

const router: Router = express.Router();

router.post('/create-invoice', async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, description } = req.body;
    const userId = (req as any).user?.uid;

    if (!bookingId || !amount || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const invoice = await createPaymentInvoice(bookingId, userId, amount, description);
    return res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.get('/invoice/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.get('/booking/:bookingId/status', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const invoice = await getInvoiceByBookingId(bookingId);

    if (!invoice) {
      return res.status(404).json({ error: 'No payment found for this booking' });
    }

    return res.json({ status: invoice.status, paidAt: invoice.paidAt });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
});

router.post('/xendit-webhook', async (req: Request, res: Response) => {
  try {
    const { external_id, status, paid_at } = req.body;

    if (!external_id || !status) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    const bookingId = external_id.replace('booking_', '');
    const invoice = await getInvoiceByBookingId(bookingId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await updateInvoiceStatus(invoice.id, status, paid_at);

    if (status === 'PAID') {
      await updatePaymentStatus(bookingId, 'paid');
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
