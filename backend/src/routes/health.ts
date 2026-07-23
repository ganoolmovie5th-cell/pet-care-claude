import express, { Router, Request, Response } from 'express';
import { createPet, getPetsByOwnerId, addHealthRecord, getHealthRecordsByPetId } from '../services/health';

const router: Router = express.Router();

router.post('/pets', async (req: Request, res: Response) => {
  try {
    const { ownerId, name, breed, age, photo, microchip } = req.body;
    if (!ownerId || !name || !breed || age === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const petId = await createPet({ ownerId, name, breed, age, photo, microchip });
    return res.status(201).json({ id: petId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create pet' });
  }
});

router.get('/pets/owner/:ownerId', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const pets = await getPetsByOwnerId(ownerId);
    return res.json(pets);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

router.post('/records', async (req: Request, res: Response) => {
  try {
    const { petId, type, date, note, vet_name, next_due_date } = req.body;
    if (!petId || !type || !date || !note) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const recordId = await addHealthRecord({ petId, type, date, note, vet_name, next_due_date });
    return res.status(201).json({ id: recordId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add health record' });
  }
});

router.get('/records/pet/:petId', async (req: Request, res: Response) => {
  try {
    const { petId } = req.params;
    const records = await getHealthRecordsByPetId(petId);
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

export default router;
