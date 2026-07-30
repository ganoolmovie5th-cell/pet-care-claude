import express, { Router, Request, Response } from 'express';
import { auth } from '../config/firebase';
import { createOrUpdateUser } from '../services/user';

const router: Router = express.Router();

interface VerifyTokenRequest {
  idToken: string;
}

router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as VerifyTokenRequest;

    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Ensure user doc exists with flagged field
    await createOrUpdateUser(userId, {
      uid: userId,
      flagged: false,
    });

    // The client keeps using the Firebase ID token; this endpoint only
    // provisions the user document.
    return res.json({ userId });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      error: 'Invalid token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
