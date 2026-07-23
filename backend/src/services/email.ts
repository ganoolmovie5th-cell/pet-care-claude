import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM = process.env.SENDGRID_FROM_EMAIL || 'noreply@petcare.app';

export async function sendBookingConfirmation(
  _ownerId: string,
  ownerEmail: string,
  booking: { id: string; petName: string; vetName: string; date: string; time: string }
): Promise<void> {
  await sgMail.send({
    to: ownerEmail,
    from: FROM,
    subject: 'Booking Confirmed – Pet Care',
    text: `Hi! Your booking for ${booking.petName} with ${booking.vetName} on ${booking.date} at ${booking.time} is confirmed. Booking ID: ${booking.id}`,
    html: `<p>Hi!</p><p>Your booking for <strong>${booking.petName}</strong> with ${booking.vetName} on ${booking.date} at ${booking.time} is confirmed.</p><p>Booking ID: ${booking.id}</p>`,
  });
}

export async function sendPaymentReceipt(
  vetEmail: string,
  invoice: { id: string; amount: number; currency: string; description: string; date: string }
): Promise<void> {
  await sgMail.send({
    to: vetEmail,
    from: FROM,
    subject: `Payment Received – Invoice ${invoice.id}`,
    text: `Payment of ${invoice.currency} ${invoice.amount} received for ${invoice.description} on ${invoice.date}. Invoice: ${invoice.id}`,
    html: `<p>Payment of <strong>${invoice.currency} ${invoice.amount}</strong> received for ${invoice.description} on ${invoice.date}.</p><p>Invoice ID: ${invoice.id}</p>`,
  });
}

export async function sendSubscriptionReminder(
  vetEmail: string,
  vetName: string,
  daysUntilExpiry: number
): Promise<void> {
  await sgMail.send({
    to: vetEmail,
    from: FROM,
    subject: `Your Pet Care subscription expires in ${daysUntilExpiry} days`,
    text: `Hi ${vetName}, your subscription expires in ${daysUntilExpiry} days. Renew now to avoid interruption.`,
    html: `<p>Hi ${vetName},</p><p>Your subscription expires in <strong>${daysUntilExpiry} days</strong>. <a href="https://petcare.app/renew">Renew now</a> to avoid interruption.</p>`,
  });
}

export async function sendSubscriptionOverdue(
  vetEmail: string,
  vetName: string
): Promise<void> {
  await sgMail.send({
    to: vetEmail,
    from: FROM,
    subject: 'Your Pet Care subscription is overdue',
    text: `Hi ${vetName}, your subscription has expired. Please renew immediately to restore access.`,
    html: `<p>Hi ${vetName},</p><p>Your subscription has <strong>expired</strong>. <a href="https://petcare.app/renew">Renew immediately</a> to restore access.</p>`,
  });
}
