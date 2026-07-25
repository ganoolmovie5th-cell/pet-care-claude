import * as functions from 'firebase-functions';
import { db } from '../config/firebase';
import { sendPlaydateMatch } from '../services/notifications';

// Triggers on playdate_interested document creation
// Sends notification to post owner when someone is interested
export const notifyPlaydateInterest = functions.firestore
  .document('playdate_interested/{interestedId}')
  .onCreate(async snapshot => {
    const interested = snapshot.data();
    const { postId, interestedOwnerId } = interested;

    try {
      // Get playdate post details
      const postDoc = await db.collection('playdate_posts').doc(postId).get();
      if (!postDoc.exists) return;

      const post = postDoc.data();
      if (!post) return;
      const postOwnerId = post.ownerId;

      // Get interested owner details
      const interestedOwnerDoc = await db.collection('users').doc(interestedOwnerId).get();
      if (!interestedOwnerDoc.exists) return;

      const interestedOwner = interestedOwnerDoc.data();
      const interestedOwnerName = interestedOwner?.name || 'Someone';

      // Get post owner's pet name
      const petDoc = await db.collection('pets').doc(post.petId).get();
      const petName = petDoc.exists ? (petDoc.data() as any).name : 'A pet';

      // Send notification to post owner
      await sendPlaydateMatch(postOwnerId, interestedOwnerName, petName, postId);

      console.log(`✓ Sent playdate interest notification: ${interestedOwnerName} → ${postOwnerId}`);
    } catch (error) {
      console.error(`✗ Failed to send playdate notification for ${postId}:`, error);
      throw error;
    }
  });
