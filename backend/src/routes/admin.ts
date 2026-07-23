import express, { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { db } from '../config/firebase';
import { createRecurringInvoice } from '../services/payment';
import { getVetById } from '../services/vet';

const router: Router = express.Router();

router.post('/:vetId/approve', adminAuth, async (req: Request, res: Response) => {
  try {
    const { vetId } = req.params;

    const vet = await getVetById(vetId);
    if (!vet) {
      return res.status(404).json({ error: 'Vet not found' });
    }

    const amount = 350000;
    const payerEmail = vet.clinic_name;
    const description = `Monthly subscription for ${vet.clinic_name}`;

    const invoice = await createRecurringInvoice(
      `vet-${vetId}`,
      amount,
      payerEmail,
      description,
      3600,
      1
    );

    await db.collection('vets').doc(vetId).update({
      status: 'approved',
      subscription_id: invoice.id,
      subscription_status: 'pending',
      approved_at: new Date().toISOString(),
    });

    return res.status(201).json({
      subscription_id: invoice.id,
      nextBillingDate: invoice.nextBillingDate,
    });
  } catch (error) {
    console.error('Error approving vet:', error);
    return res.status(500).json({ error: 'Failed to approve vet' });
  }
});

router.post('/:vetId/block', adminAuth, async (req: Request, res: Response) => {
  try {
    const { vetId } = req.params;

    const vet = await getVetById(vetId);
    if (!vet) {
      return res.status(404).json({ error: 'Vet not found' });
    }

    await db.collection('vets').doc(vetId).update({
      status: 'blocked',
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error blocking vet:', error);
    return res.status(500).json({ error: 'Failed to block vet' });
  }
});

export default router;
