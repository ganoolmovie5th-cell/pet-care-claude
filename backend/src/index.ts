import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import vetsRoutes from './routes/vets';
import bookingsRoutes from './routes/bookings';
import healthRoutes from './routes/health';
import playdateRoutes from './routes/playdate';
import chatRoutes from './routes/chat';
import paymentsRoutes from './routes/payments';
import analyticsRoutes from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/vets', vetsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/health', healthRoutes);
app.use('/playdate', playdateRoutes);
app.use('/chat', chatRoutes);
app.use('/payments', paymentsRoutes);
app.use('/analytics', analyticsRoutes);

app.use(errorHandler);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
