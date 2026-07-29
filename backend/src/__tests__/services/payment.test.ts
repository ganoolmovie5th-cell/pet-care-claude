import axios from 'axios';
import {
  createPaymentInvoice,
  getInvoiceById,
  updateInvoiceStatus,
  getInvoiceByBookingId,
  createRecurringInvoice,
} from '../../services/payment';
import { db } from '../../config/firebase';
import type { FakeFirestore } from '../helpers/fake-firestore';

jest.mock('axios');

const fake = db as unknown as FakeFirestore;
const post = (axios as jest.Mocked<typeof axios>).post as jest.Mock;

describe('Payment Service', () => {
  beforeEach(() => {
    fake.reset();
    post.mockReset();
  });

  describe('createPaymentInvoice', () => {
    beforeEach(() => {
      post.mockResolvedValue({
        data: { id: 'xendit-1', invoice_url: 'https://checkout.test/xendit-1' },
      });
    });

    it('returns a pending invoice built from the Xendit response', async () => {
      const invoice = await createPaymentInvoice('booking-1', 'user-1', 150000, 'Konsultasi');

      expect(invoice.status).toBe('PENDING');
      expect(invoice.currency).toBe('IDR');
      expect(invoice.xenditInvoiceId).toBe('xendit-1');
      expect(invoice.invoiceUrl).toBe('https://checkout.test/xendit-1');
      expect(invoice.id).toMatch(/^inv_\d+$/);
      expect(Date.parse(invoice.createdAt)).not.toBeNaN();
    });

    it('sends the booking as external_id with IDR and the redirect deeplinks', async () => {
      await createPaymentInvoice('booking-1', 'user-1', 150000, 'Konsultasi');

      const [url, body] = post.mock.calls[0];
      expect(url).toBe('https://api.xendit.co/v2/invoices');
      expect(body).toMatchObject({
        external_id: 'booking_booking-1',
        amount: 150000,
        currency: 'IDR',
        description: 'Konsultasi',
        success_redirect_url: 'app://payment/success/booking-1',
        failure_redirect_url: 'app://payment/failure/booking-1',
      });
    });

    it('persists the invoice under its own id', async () => {
      const invoice = await createPaymentInvoice('booking-1', 'user-1', 150000, 'Konsultasi');

      expect(fake.raw('payment_invoices', invoice.id)).toMatchObject({ bookingId: 'booking-1' });
    });

    it('propagates a Xendit failure instead of writing a half-made invoice', async () => {
      post.mockRejectedValueOnce(new Error('xendit down'));

      await expect(
        createPaymentInvoice('booking-1', 'user-1', 150000, 'Konsultasi')
      ).rejects.toThrow('xendit down');
      expect(fake.count('payment_invoices')).toBe(0);
    });
  });

  describe('getInvoiceById', () => {
    it('returns the stored invoice', async () => {
      fake.seed('payment_invoices', {
        'inv-1': { id: 'inv-1', bookingId: 'booking-1', status: 'PENDING' },
      });

      await expect(getInvoiceById('inv-1')).resolves.toMatchObject({ bookingId: 'booking-1' });
    });

    it('returns null for an unknown invoice', async () => {
      await expect(getInvoiceById('missing')).resolves.toBeNull();
    });
  });

  describe('updateInvoiceStatus', () => {
    beforeEach(() => {
      fake.seed('payment_invoices', {
        'inv-1': { id: 'inv-1', bookingId: 'booking-1', status: 'PENDING' },
      });
    });

    it('records paidAt when one is given', async () => {
      await updateInvoiceStatus('inv-1', 'PAID', '2026-07-20T10:00:00.000Z');

      expect(fake.raw('payment_invoices', 'inv-1')).toMatchObject({
        status: 'PAID',
        paidAt: '2026-07-20T10:00:00.000Z',
      });
    });

    it('leaves paidAt unset for a non-paid status', async () => {
      await updateInvoiceStatus('inv-1', 'EXPIRED');

      const stored = fake.raw('payment_invoices', 'inv-1') as Record<string, unknown>;
      expect(stored.status).toBe('EXPIRED');
      expect(stored).not.toHaveProperty('paidAt');
    });

    it('rejects when the invoice does not exist', async () => {
      await expect(updateInvoiceStatus('missing', 'PAID')).rejects.toThrow();
    });
  });

  describe('getInvoiceByBookingId', () => {
    it('finds the invoice for a booking', async () => {
      fake.seed('payment_invoices', {
        'inv-1': { id: 'inv-1', bookingId: 'booking-1' },
        'inv-2': { id: 'inv-2', bookingId: 'booking-2' },
      });

      await expect(getInvoiceByBookingId('booking-2')).resolves.toMatchObject({ id: 'inv-2' });
    });

    it('returns null when the booking has no invoice', async () => {
      await expect(getInvoiceByBookingId('booking-none')).resolves.toBeNull();
    });
  });

  describe('createRecurringInvoice', () => {
    it('returns an active subscription with the next billing date moved by the interval', async () => {
      post.mockResolvedValue({ data: { id: 'recur-1' } });

      const invoice = await createRecurringInvoice(
        'sub_vet-1',
        299000,
        'vet@example.test',
        'Vet subscription',
        86400,
        3
      );

      expect(invoice).toMatchObject({
        id: 'recur-1',
        externalId: 'sub_vet-1',
        amount: 299000,
        payerEmail: 'vet@example.test',
        status: 'ACTIVE',
      });

      const next = new Date(invoice.nextBillingDate);
      const now = new Date();
      const months = (next.getFullYear() - now.getFullYear()) * 12 + next.getMonth() - now.getMonth();
      expect(months).toBe(3);
    });

    it('sends a monthly interval to Xendit', async () => {
      post.mockResolvedValue({ data: { id: 'recur-1' } });

      await createRecurringInvoice('sub_vet-1', 299000, 'vet@example.test', 'Sub', 86400, 1);

      const [url, body] = post.mock.calls[0];
      expect(url).toBe('https://api.xendit.co/recurring_invoices');
      expect(body).toMatchObject({
        external_id: 'sub_vet-1',
        payer_email: 'vet@example.test',
        currency: 'IDR',
        interval: 'MONTH',
        interval_count: 1,
        invoice_expiry: 86400,
      });
    });

    // ponytail: nothing to assert in Firestore — the service returns the
    // subscription without persisting it, which is what callers see today.
    it('does not persist the recurring invoice', async () => {
      post.mockResolvedValue({ data: { id: 'recur-1' } });

      await createRecurringInvoice('sub_vet-1', 299000, 'vet@example.test', 'Sub', 86400, 1);

      expect(fake.count('recurring_invoices')).toBe(0);
    });
  });
});
