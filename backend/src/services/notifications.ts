import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
