import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export const verifyVetAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = await auth.verifyIdToken(token);
    const vetClaim = decoded['custom']?.vet;
    if (!vetClaim) return res.status(403).json({ error: 'Vet access required' });
    if (vetClaim !== req.params.vetId) return res.status(403).json({ error: 'Forbidden' });
    req.userId = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
