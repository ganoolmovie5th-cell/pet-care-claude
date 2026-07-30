import express, { Router, Request, Response } from 'express';
import { getPlaydateMatches } from '../services/geo-matching';
import { getPetsByOwnerId } from '../services/health';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router();

// GET /playdate/matches — Get matching playdate posts
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lat, lng, petId, radiusKm = '5', sort = 'score' } = req.query;

    if (lat === undefined || lng === undefined || !petId) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lng, petId' });
    }

    const pets = await getPetsByOwnerId(req.userId!);
    if (!pets.some(p => p.id === petId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const matches = await getPlaydateMatches(
      parseFloat(lat as string),
      parseFloat(lng as string),
      petId as string,
      parseInt(radiusKm as string, 10),
      sort as 'score' | 'recent'
    );

    return res.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

export default router;
