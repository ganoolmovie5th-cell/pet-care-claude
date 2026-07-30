import express, { Router, Request, Response } from 'express';
import { createPet, getPetsByOwnerId, addHealthRecord, getHealthRecordsByPetId } from '../services/health';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router();

// ponytail: no getPetById in the service, so ownership is checked against the
// caller's own pets. One extra read, no new service surface.
const ownsPet = async (ownerId: string, petId: string): Promise<boolean> => {
  const pets = await getPetsByOwnerId(ownerId);
  return pets.some(p => p.id === petId);
};

router.post('/pets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, breed, age, photo, microchip } = req.body;
    if (!name || !breed || age === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const petId = await createPet({ ownerId: req.userId!, name, breed, age, photo, microchip });
    return res.status(201).json({ id: petId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create pet' });
  }
});

router.get('/pets/owner/:ownerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const pets = await getPetsByOwnerId(req.userId);
    return res.json(pets);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

router.post('/records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { petId, type, date, note, vet_name, next_due_date } = req.body;
    if (!petId || !type || !date || !note) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!(await ownsPet(req.userId!, petId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const recordId = await addHealthRecord({ petId, type, date, note, vet_name, next_due_date });
    return res.status(201).json({ id: recordId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add health record' });
  }
});

router.get('/records/pet/:petId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { petId } = req.params;
    if (!(await ownsPet(req.userId!, petId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const records = await getHealthRecordsByPetId(petId);
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

export default router;
