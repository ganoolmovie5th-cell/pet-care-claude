import axios from 'axios';
import { db } from '../config/firebase';

const xenditApiKey = process.env.XENDIT_API_KEY;
const xenditBaseUrl = 'https://api.xendit.co';

export interface PaymentInvoice {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  invoiceUrl: string;
  xenditInvoiceId: string;
  paidAt?: string;
  createdAt: string;
}

export async function createPaymentInvoice(
  bookingId: string,
  userId: string,
  amount: number,
  description: string
): Promise<PaymentInvoice> {
  const xenditResponse = await axios.post(
    `${xenditBaseUrl}/v2/invoices`,
    {
      external_id: `booking_${bookingId}`,
      amount,
      currency: 'IDR',
      description,
      invoice_duration: 86400,
      success_redirect_url: `app://payment/success/${bookingId}`,
      failure_redirect_url: `app://payment/failure/${bookingId}`,
    },
    {
      auth: {
        username: xenditApiKey,
        password: '',
      },
    }
  );

  const invoiceData: PaymentInvoice = {
    id: `inv_${Date.now()}`,
    bookingId,
    userId,
    amount,
    currency: 'IDR',
    status: 'PENDING',
    invoiceUrl: xenditResponse.data.invoice_url,
    xenditInvoiceId: xenditResponse.data.id,
    createdAt: new Date().toISOString(),
  };

  await db.collection('payment_invoices').doc(invoiceData.id).set(invoiceData);

  return invoiceData;
}

export async function getInvoiceById(invoiceId: string): Promise<PaymentInvoice | null> {
  const doc = await db.collection('payment_invoices').doc(invoiceId).get();
  if (!doc.exists) return null;
  return doc.data() as PaymentInvoice;
}

export async function updateInvoiceStatus(invoiceId: string, status: PaymentInvoice['status'], paidAt?: string): Promise<void> {
  const updateData: any = { status };
  if (paidAt) updateData.paidAt = paidAt;
  await db.collection('payment_invoices').doc(invoiceId).update(updateData);
}

export async function getInvoiceByBookingId(bookingId: string): Promise<PaymentInvoice | null> {
  const snapshot = await db.collection('payment_invoices').where('bookingId', '==', bookingId).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as PaymentInvoice;
}
