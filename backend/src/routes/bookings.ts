import express, { Router, Request, Response } from 'express';
import { createBooking, getBookingsByOwnerId } from '../services/booking';
import { getVetById } from '../services/vet';
import { getPetsByOwnerId } from '../services/health';
import { sendBookingConfirmationSMS } from '../services/notifications';
import { authenticateToken } from '../middleware/auth';
import { db } from '../config/firebase';

const router: Router = express.Router();

interface CreateBookingRequest {
  petId: string;
  vetId: string;
  date: string;
  time: string;
  notes?: string;
}

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { petId, vetId, date, time, notes } = req.body as CreateBookingRequest;
    const ownerId = req.userId!;

    if (!petId || !vetId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pets = await getPetsByOwnerId(ownerId);
    const pet = pets.find(p => p.id === petId);
    if (!pet) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bookingId = await createBooking({
      ownerId,
      petId,
      vetId,
      date,
      time,
      notes,
      status: 'pending',
      payment_status: 'pending',
    });

    // Send SMS confirmation
    try {
      const userDoc = await db.collection('users').doc(ownerId).get();
      const userData = userDoc.data();
      const phoneNumber = userData?.phone;

      if (phoneNumber) {
        const vetData = await getVetById(vetId);

        if (vetData) {
          await sendBookingConfirmationSMS(
            phoneNumber,
            pet.name,
            vetData.clinic_name,
            date
          );
        }
      }
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      // Don't fail booking creation if SMS fails
    }

    return res.status(201).json({ id: bookingId, message: 'Booking created' });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.get('/owner/:ownerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const bookings = await getBookingsByOwnerId(req.userId);
    return res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

export default router;
