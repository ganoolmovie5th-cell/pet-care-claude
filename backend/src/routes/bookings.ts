import express, { Router, Request, Response } from 'express';
import { createBooking, getBookingsByOwnerId } from '../services/booking';
import { getVetById } from '../services/vet';
import { getPetsByOwnerId } from '../services/health';
import { sendBookingConfirmationSMS } from '../services/notifications';
import { db } from '../config/firebase';

const router: Router = express.Router();

interface CreateBookingRequest {
  ownerId: string;
  petId: string;
  vetId: string;
  date: string;
  time: string;
  notes?: string;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, petId, vetId, date, time, notes } = req.body as CreateBookingRequest;

    if (!ownerId || !petId || !vetId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
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
        const pets = await getPetsByOwnerId(ownerId);
        const pet = pets.find(p => p.id === petId);

        if (vetData && pet) {
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

    res.status(201).json({ id: bookingId, message: 'Booking created' });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.get('/owner/:ownerId', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const bookings = await getBookingsByOwnerId(ownerId);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

export default router;
