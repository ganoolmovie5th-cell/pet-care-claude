import express, { Router, Request, Response } from 'express';
import { getAllVets, getVetById, searchVets } from '../services/vet';

const router: Router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const vets = await getAllVets();
    res.json(vets);
  } catch (error) {
    console.error('Error fetching vets:', error);
    res.status(500).json({ error: 'Failed to fetch vets' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { city, specialty, minRating, maxDistance, lat, lng } = req.query;

    const filters = {
      city: city as string | undefined,
      specialty: specialty as string | undefined,
      minRating: minRating ? parseInt(minRating as string) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance as string) : undefined,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
    };

    const vets = await searchVets(filters);
    res.json(vets);
  } catch (error) {
    console.error('Error searching vets:', error);
    res.status(500).json({ error: 'Failed to search vets' });
  }
});

router.get('/:vetId', async (req: Request, res: Response) => {
  try {
    const { vetId } = req.params;
    const vet = await getVetById(vetId);

    if (!vet) {
      return res.status(404).json({ error: 'Vet not found' });
    }

    return res.json(vet);
  } catch (error) {
    console.error('Error fetching vet:', error);
    return res.status(500).json({ error: 'Failed to fetch vet' });
  }
});

export default router;
