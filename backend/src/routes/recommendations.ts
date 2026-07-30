import express, { Router, Request, Response } from 'express';
import { getVetRecommendations } from '../services/recommendations';
import { getPetsByOwnerId } from '../services/health';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router();

// GET /recommendations/vets — Get recommended vets for owner
router.get('/vets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lat, lng, petId, limit = '10' } = req.query;
    const ownerId = req.userId!;

    if (lat === undefined || lng === undefined || !petId) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lng, petId' });
    }

    const pets = await getPetsByOwnerId(ownerId);
    if (!pets.some(p => p.id === petId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recommendations = await getVetRecommendations(
      ownerId,
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
