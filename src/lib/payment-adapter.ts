import { HARD_LIMIT_INR } from './constants';

export interface PaymentIntent {
  amount: number; recipientHandle: string; recipientName: string;
  rail: string; note?: string; forceFailure?: boolean;
}
export type PaymentOutcome =
  | { ok: true; reference: string; mode: 'mock' | 'razorpay_test' }
  | { ok: false; reason: string; code: 'timeout' | 'declined' | 'limit' | 'gateway'; retryable: boolean };

/**
 * The only component that "moves money". In this prototype it moves nothing:
 * it returns a synthetic reference. If RAZORPAY_KEY_ID is configured it creates
 * a Razorpay *test mode* order instead, which still moves no real money.
 *
 * The adapter re-checks the hard limit. Defence in depth: even if a caller
 * somehow reached this layer with an over-limit amount, it stops here.
 */
export async function executePayment(intent: PaymentIntent): Promise<PaymentOutcome> {
  if (!Number.isFinite(intent.amount) || intent.amount <= 0)
    return { ok: false, reason: 'Invalid amount.', code: 'declined', retryable: false };

  if (intent.amount > HARD_LIMIT_INR)
    return {
      ok: false,
      code: 'limit', retryable: false,
      reason: `Guardian allows a maximum of ₹${HARD_LIMIT_INR.toLocaleString('en-IN')} per recipient per transaction.`,
    };

  // Demo hook for the graceful-failure scenario.
  if (intent.forceFailure) {
    await wait(1400);
    return {
      ok: false, code: 'timeout', retryable: true,
      reason: 'The test payment gateway did not respond in time.',
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret && keyId.startsWith('rzp_test_')) {
    try {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        body: JSON.stringify({
          amount: Math.round(intent.amount * 100), // paise
          currency: 'INR',
          receipt: `grd_${Date.now()}`,
          notes: { rail: intent.rail, prototype: 'guardian-hackathon' },
        }),
      });
      if (res.ok) {
        const order = await res.json();
        return { ok: true, reference: order.id, mode: 'razorpay_test' };
      }
      return { ok: false, code: 'gateway', retryable: true, reason: 'Test gateway rejected the order.' };
    } catch {
      return { ok: false, code: 'timeout', retryable: true, reason: 'Could not reach the test gateway.' };
    }
  }

  await wait(700);
  return { ok: true, reference: `MOCK${Date.now().toString().slice(-10)}`, mode: 'mock' };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
