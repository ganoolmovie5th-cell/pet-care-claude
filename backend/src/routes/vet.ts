import { Router, Request, Response } from 'express';
import { verifyVetAuth } from '../middleware/vetAuth';
import { getVetEarnings, getVetBookings } from '../services/vetEarnings';

const router = Router();

router.get('/:vetId/dashboard', verifyVetAuth, async (req: Request, res: Response) => {
  const { vetId } = req.params;
  const [earnings, recentBookings] = await Promise.all([
    getVetEarnings(vetId),
    getVetBookings(vetId, 10),
  ]);
  res.json({ earnings, recentBookings });
});

router.get('/:vetId/bookings', verifyVetAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const bookings = await getVetBookings(req.params.vetId, limit);
  res.json({ bookings });
});

export default router;
