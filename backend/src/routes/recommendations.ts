import express, { Router, Request, Response } from 'express';
import { getVetRecommendations } from '../services/recommendations';

const router: Router = express.Router();

// GET /recommendations/vets — Get recommended vets for owner
router.get('/vets', async (req: Request, res: Response) => {
  try {
    const { ownerId, lat, lng, petId, limit = '10' } = req.query;

    if (!ownerId || lat === undefined || lng === undefined || !petId) {
      return res.status(400).json({ error: 'Missing required parameters: ownerId, lat, lng, petId' });
    }

    const recommendations = await getVetRecommendations(
      ownerId as string,
      parseFloat(lat as string),
      parseFloat(lng as string),
      petId as string,
      parseInt(limit as string, 10)
    );

    return res.json({ recommended_vets: recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
