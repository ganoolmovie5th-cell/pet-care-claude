import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
