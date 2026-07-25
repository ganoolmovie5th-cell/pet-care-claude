import twilio from 'twilio';
import admin, { db } from '../config/firebase';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// FCM Notification Types
export interface FCMToken {
  id: string;
  userId: string;
  token: string;
  device: 'iOS' | 'Android';
  created_at: string;
  last_used: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'booking' | 'playdate_match' | 'reminder' | 'message';
  title: string;
  body: string;
  data?: Record<string, string>;
  deeplink?: string;
  sent_at: string;
  read_at?: string;
}

export async function sendAppointmentReminderSMS(
  phoneNumber: string,
  vetClinicName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<void> {
  const message = `Reminder: Jadwal appointment Anda di ${vetClinicName} pada ${appointmentDate} pukul ${appointmentTime}. Hubungi clinic jika perlu cancel.`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phoneNumber,
  });
}

export async function sendBookingConfirmationSMS(
  phoneNumber: string,
  petName: string,
  vetClinicName: string,
  appointmentDate: string
): Promise<void> {
  const message = `Booking confirmed! ${petName} akan diperiksa di ${vetClinicName} pada ${appointmentDate}. Terima kasih!`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phoneNumber,
  });
}

export async function sendPaymentConfirmationSMS(
  phoneNumber: string,
  amount: number,
  transactionId: string
): Promise<void> {
  const message = `Pembayaran sebesar Rp${amount.toLocaleString('id-ID')} berhasil. ID: ${transactionId}. Terima kasih!`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phoneNumber,
  });
}

// FCM Token Management
export const registerFCMToken = async (
  userId: string,
  token: string,
  device: 'iOS' | 'Android'
): Promise<string> => {
  const docRef = await db.collection('fcm_tokens').add({
    userId,
    token,
    device,
    created_at: new Date().toISOString(),
    last_used: new Date().toISOString(),
  });
  return docRef.id;
};

export const getFCMTokensByUserId = async (userId: string): Promise<string[]> => {
  const snapshot = await db.collection('fcm_tokens').where('userId', '==', userId).get();
  return snapshot.docs.map(doc => (doc.data() as FCMToken).token);
};

export const removeFCMToken = async (token: string): Promise<void> => {
  const snapshot = await db.collection('fcm_tokens').where('token', '==', token).get();
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
  }
};

// FCM Notification Sending
export const sendFCMNotification = async (
  userId: string,
  type: 'booking' | 'playdate_match' | 'reminder' | 'message',
  title: string,
  body: string,
  data?: Record<string, string>,
  deeplink?: string
): Promise<void> => {
  try {
    const tokens = await getFCMTokensByUserId(userId);
    if (tokens.length === 0) {
      console.log(`No FCM tokens for user ${userId}`);
      return;
    }

    await db.collection('user_notifications').add({
      userId,
      type,
      title,
      body,
      data: data || {},
      deeplink: deeplink || null,
      sent_at: new Date().toISOString(),
      read_at: null,
    });

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type,
        deeplink: deeplink || '',
        ...data,
      },
    };

    for (const token of tokens) {
      try {
        await admin.messaging().sendToDevice(token, message);
      } catch (error) {
        console.error(`Error sending to token ${token}:`, error);
        if ((error as any).code === 'messaging/invalid-registration-token') {
          await removeFCMToken(token);
        }
      }
    }
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
};

// Notification History
export const getUserNotifications = async (
  userId: string,
  unreadOnly: boolean = false,
  limit: number = 20,
  offset: number = 0
): Promise<{ notifications: UserNotification[]; total: number }> => {
  let query = db.collection('user_notifications').where('userId', '==', userId);
  if (unreadOnly) {
    query = query.where('read_at', '==', null);
  }

  const countSnapshot = await query.get();
  const total = countSnapshot.size;

  const snapshot = await query
    .orderBy('sent_at', 'desc')
    .limit(limit)
    .offset(offset)
    .get();

  return {
    notifications: snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as UserNotification)),
    total,
  };
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await db
    .collection('user_notifications')
    .doc(notificationId)
    .update({
      read_at: new Date().toISOString(),
    });
};

// Combined SMS + FCM Helpers
export const sendBookingConfirmationBoth = async (
  phoneNumber: string,
  userId: string,
  petName: string,
  vetClinicName: string,
  appointmentDate: string,
  bookingId: string
): Promise<void> => {
  await sendBookingConfirmationSMS(phoneNumber, petName, vetClinicName, appointmentDate);
  await sendFCMNotification(
    userId,
    'booking',
    '🎉 Booking Confirmed',
    `${petName}'s appointment with ${vetClinicName} on ${appointmentDate} is confirmed`,
    { bookingId },
    `app://booking/${bookingId}`
  );
};

export const sendVaccinationReminder = async (
  userId: string,
  petName: string,
  vaccine: string,
  recordId: string
): Promise<void> => {
  await sendFCMNotification(
    userId,
    'reminder',
    '🩺 Vaccination Due',
    `${petName}'s ${vaccine} vaccination is due in 7 days — book now`,
    { recordId },
    `app://health/${recordId}`
  );
};

export const sendPlaydateMatch = async (
  userId: string,
  matcherName: string,
  petName: string,
  postId: string
): Promise<void> => {
  await sendFCMNotification(
    userId,
    'playdate_match',
    '👀 New Playdate Match',
    `${matcherName} is interested in playdating with ${petName}!`,
    { postId },
    `app://playdate/${postId}`
  );
};

