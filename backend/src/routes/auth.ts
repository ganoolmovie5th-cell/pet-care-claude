import express, { Router, Request, Response } from 'express';
import { auth } from '../config/firebase';

const router: Router = express.Router();

interface VerifyTokenRequest {
  idToken: string;
}

const generateJWT = (userId: string): string => {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')}.${encodedPayload}`);
  const signature = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')}.${encodedPayload}.${signature}`;
};

router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as VerifyTokenRequest;

    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const jwt = generateJWT(userId);

    return res.json({
      token: jwt,
      expiresIn: '7d',
      userId,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      error: 'Invalid token', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
