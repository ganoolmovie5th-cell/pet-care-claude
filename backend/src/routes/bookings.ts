import express, { Router, Request, Response } from 'express';
import { createBooking, getBookingsByOwnerId } from '../services/booking';

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
