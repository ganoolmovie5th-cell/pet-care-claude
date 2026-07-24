import { db } from '../config/firebase';
import { PlaydatePost, PlaydateChat, Message } from '../types/playdate';

export async function createPlaydatePost(
  post: Omit<PlaydatePost, 'id' | 'created_at' | 'updated_at'>
): Promise<PlaydatePost> {
  const ref = db.collection('playdate_posts').doc();
  const now = new Date().toISOString();
  const newPost: PlaydatePost = {
    ...post,
    id: ref.id,
    created_at: now,
    updated_at: now,
  };
  await ref.set(newPost);
  return newPost;
}

export async function getPlaydatePost(postId: string): Promise<PlaydatePost | null> {
  const doc = await db.collection('playdate_posts').doc(postId).get();
  return doc.exists ? (doc.data() as PlaydatePost) : null;
}

export async function updatePlaydatePost(
  postId: string,
  updates: Partial<PlaydatePost>
): Promise<void> {
  await db.collection('playdate_posts').doc(postId).update({
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function getPlaydatePostsByOwner(ownerId: string): Promise<PlaydatePost[]> {
  const docs = await db
    .collection('playdate_posts')
    .where('ownerId', '==', ownerId)
    .orderBy('created_at', 'desc')
    .get();
  return docs.docs.map(d => d.data() as PlaydatePost);
}

export async function getAllActivePosts(): Promise<PlaydatePost[]> {
  const docs = await db
    .collection('playdate_posts')
    .where('status', '==', 'active')
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();
  return docs.docs.map(d => d.data() as PlaydatePost);
}

export async function addInterestedOwner(postId: string, ownerId: string): Promise<void> {
  const post = await getPlaydatePost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  if (!post.interested_owners.includes(ownerId)) {
    await db.collection('playdate_posts').doc(postId).update({
      interested_owners: [...post.interested_owners, ownerId],
    });
  }
}

export async function removeInterestedOwner(postId: string, ownerId: string): Promise<void> {
  const post = await getPlaydatePost(postId);
  if (!post) throw new Error(`Post ${postId} not found`);
  await db.collection('playdate_posts').doc(postId).update({
    interested_owners: post.interested_owners.filter(id => id !== ownerId),
  });
}

export async function createPlaydateChat(
  postId: string,
  ownerId: string,
  interestedOwnerId: string,
  initialMessage: string
): Promise<PlaydateChat> {
  const ref = db.collection('playdate_chat').doc();
  const now = new Date().toISOString();
  const newChat: PlaydateChat = {
    id: ref.id,
    postId,
    ownerId,
    interestedOwnerId,
    messages: [{ sender: ownerId, text: initialMessage, timestamp: now }],
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  await ref.set(newChat);
  return newChat;
}

export async function getPlaydateChatsByPost(postId: string): Promise<PlaydateChat[]> {
  const docs = await db
    .collection('playdate_chat')
    .where('postId', '==', postId)
    .orderBy('created_at', 'desc')
    .get();
  return docs.docs.map(d => d.data() as PlaydateChat);
}

export async function getPlaydateChat(chatId: string): Promise<PlaydateChat | null> {
  const doc = await db.collection('playdate_chat').doc(chatId).get();
  return doc.exists ? (doc.data() as PlaydateChat) : null;
}

export async function addMessageToChat(
  chatId: string,
  sender: string,
  text: string
): Promise<void> {
  const chat = await getPlaydateChat(chatId);
  if (!chat) throw new Error(`Chat ${chatId} not found`);

  const newMessage: Message = {
    sender,
    text,
    timestamp: new Date().toISOString(),
  };

  await db.collection('playdate_chat').doc(chatId).update({
    messages: [...chat.messages, newMessage],
    updated_at: new Date().toISOString(),
  });
}
