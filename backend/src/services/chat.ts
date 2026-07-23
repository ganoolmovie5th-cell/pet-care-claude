import { db } from '../config/firebase';
import admin from '../config/firebase';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[]; // [ownerId1, ownerId2]
  matchId: string;
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt: string;
}

export async function getOrCreateChat(matchId: string, userId1: string, userId2: string): Promise<Chat> {
  const chatsRef = db.collection('chats');
  const query = await chatsRef
    .where('matchId', '==', matchId)
    .where('participants', 'array-contains', userId1)
    .limit(1)
    .get();

  if (!query.empty) {
    const doc = query.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Chat;
  }

  const newChat: Chat = {
    id: '',
    participants: [userId1, userId2],
    matchId,
    createdAt: new Date().toISOString(),
  };

  const ref = await chatsRef.add(newChat);
  newChat.id = ref.id;
  return newChat;
}

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');

  const newMessage: ChatMessage = {
    id: '',
    chatId,
    senderId,
    text,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const ref = await messagesRef.add(newMessage);
  newMessage.id = ref.id;

  // Update parent chat lastMessage
  await db.collection('chats').doc(chatId).update({
    lastMessage: text,
    lastMessageTime: new Date().toISOString(),
  });

  return newMessage;
}

export async function getMessages(chatId: string, limit: number = 50): Promise<ChatMessage[]> {
  const snapshot = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatMessage[];
}

export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  const batch = admin.firestore().batch();
  const snapshot = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .where('senderId', '!=', userId)
    .where('read', '==', false)
    .get();

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
}
