import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const customClaims = decodedToken.customClaims || {};

    if (!customClaims.admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).userId = decodedToken.uid;
    return next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
