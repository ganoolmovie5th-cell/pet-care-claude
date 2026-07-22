import { Router, Request, Response } from 'express';
import {
  createPost,
  getPostById,
  searchPostsNearby,
  addInterestedOwner,
  removeInterestedOwner,
  getInterestedMatches,
  createMatch,
  updateMatchStatus,
  PlaydatePost,
  PlaydateMatch,
} from '../services/playdate';

const router = Router();

router.post('/posts', async (req: Request, res: Response) => {
  try {
    const { ownerId, petId, location, date, time, description, photos } = req.body;

    if (!ownerId || !petId || !location || !date || !time || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const postId = await createPost({
      ownerId,
      petId,
      location,
      date,
      time,
      description,
      photos: photos || [],
      status: 'open',
    } as Omit<PlaydatePost, 'id' | 'created_at' | 'interested_owners'>);

    return res.status(201).json({ id: postId });
  } catch (err) {
    console.error('Error creating playdate post:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { city, lat, lng, maxDistance } = req.query;

    if (!city) {
      return res.status(400).json({ error: 'city parameter required' });
    }

    const posts = await searchPostsNearby({
      city: city as string,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      maxDistance: maxDistance ? parseFloat(maxDistance as string) : 10,
    });

    return res.json(posts);
  } catch (err) {
    console.error('Error fetching playdate posts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const post = await getPostById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json(post);
  } catch (err) {
    console.error('Error fetching playdate post:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts/:postId/interest', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { ownerId, petId } = req.body;

    if (!ownerId || !petId) {
      return res.status(400).json({ error: 'ownerId and petId required' });
    }

    await addInterestedOwner(postId, ownerId);
    const matchId = await createMatch({
      postId,
      ownerId,
      petId,
      interested_date: new Date().toISOString(),
      status: 'pending',
    } as Omit<PlaydateMatch, 'id' | 'created_at'>);

    return res.status(201).json({ matchId });
  } catch (err) {
    console.error('Error marking interest:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/posts/:postId/interest', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { ownerId } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId required' });
    }

    await removeInterestedOwner(postId, ownerId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error removing interest:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/posts/:postId/matches', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const matches = await getInterestedMatches(postId);
    return res.json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/matches/:matchId/accept', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    await updateMatchStatus(matchId, 'accepted');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error accepting match:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/matches/:matchId/reject', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    await updateMatchStatus(matchId, 'rejected');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error rejecting match:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
