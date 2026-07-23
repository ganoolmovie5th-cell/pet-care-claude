import { Router, Request, Response, NextFunction } from 'express';
import { verifyVetAuth } from '../middleware/vetAuth';
import { getVetEarnings, getVetBookings } from '../services/vetEarnings';

const router = Router();

router.get('/:vetId/dashboard', verifyVetAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vetId } = req.params;
    const [earnings, recentBookings] = await Promise.all([
      getVetEarnings(vetId),
      getVetBookings(vetId, 10),
    ]);
    res.json({ earnings, recentBookings });
  } catch (err) {
    next(err);
  }
});

router.get('/:vetId/bookings', verifyVetAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const bookings = await getVetBookings(req.params.vetId, limit);
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

export default router;
