import * as functions from 'firebase-functions';
import { db } from '../config/firebase';
import { sendVaccinationReminder } from '../services/notifications';

// Scheduled Cloud Function — runs daily at 9 AM UTC
// Sends reminders for vaccinations due in next 7 days
export const sendVaccinationReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const todayISO = new Date().toISOString().split('T')[0];
    const deadlineISO = sevenDaysFromNow.toISOString().split('T')[0];

    try {
      // Find records with due_date in next 7 days
      const snapshot = await db
        .collection('health_records')
        .where('type', '==', 'vaccine')
        .where('next_due_date', '>=', todayISO)
        .where('next_due_date', '<=', deadlineISO)
        .where('reminder_sent', '==', false)
        .get();

      let sent = 0;

      for (const doc of snapshot.docs) {
        const record = doc.data() as { petId: string; vaccine_name: string };
        const { petId, vaccine_name } = record;

        try {
          // Get pet details
          const petDoc = await db.collection('pets').doc(petId).get();
          if (!petDoc.exists) continue;

          const pet = petDoc.data() as { ownerId: string; name: string };
          const { ownerId, name: petName } = pet;

          // Send reminder
          await sendVaccinationReminder(ownerId, petName, vaccine_name, doc.id);

          // Mark reminder as sent
          await doc.ref.update({ reminder_sent: true });

          sent++;
        } catch (error) {
          console.error(`Failed to send reminder for record ${doc.id}:`, error);
        }
      }

      console.log(`✓ Sent ${sent} vaccination reminders`);
      return { sent };
    } catch (error) {
      console.error('Vaccination reminder job failed:', error);
      throw error;
    }
  });
