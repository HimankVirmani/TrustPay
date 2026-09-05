'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Ban, ShieldCheck, UserX } from 'lucide-react';
import { useStore } from '@/lib/store';
import { inr } from '@/lib/format';
import { Button, Card, DemoNote, TopBar } from '@/components/ui';
import type { Transaction } from '@/lib/types';

const AMOUNT = 20_000;

/**
 * Scenario 9. Sets up the one case people ask about most: you paid, they took
 * the money and blocked you. Seeding the payment here rather than making the
 * presenter run through a full send keeps the demo to two taps, and it lets the
 * payment be timestamped a few hours ago so it sits inside the 24-hour window
 * where funds can still be held.
 */
export default function BlockedDemoPage() {
  const store = useStore();
  const router = useRouter();
  const [seeded, setSeeded] = useState<string | null>(null);

  function seed() {
    const id = `t_demo_${Date.now()}`;
    const at = new Date(Date.now() - 3 * 3600e3).toISOString(); // 3 hours ago
    const txn: Transaction = {
      id,
      rail: 'upi',
      recipientId: 'r_support',
      recipientName: 'Quick Refund Services',
      recipientHandle: 'refund.help@upi',
      amount: AMOUNT,
      direction: 'debit',
      note: 'Verification payment before refund is released',
      createdAt: at,
      status: 'successful',
      sourceAccountId: store.activeAccountId,
      purposeId: 'p_refund',
      audit: [
        { at, event: 'Payment initiated', actor: 'user', detail: `upi · ${inr(AMOUNT)}` },
        { at, event: 'Recipient identified', actor: 'system', detail: 'Quick Refund Services' },
        { at, event: 'Payment completed (mock)', actor: 'adapter', detail: 'MOCK-DEMO-9' },
      ],
    };
    store.addTransaction(txn);
    store.debitAccount(store.activeAccountId, AMOUNT);
    setSeeded(id);
  }

  return (
    <div className="animate-rise">
      <TopBar title="Scenario 9" onBack={() => router.back()} />

      <div className="px-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-alert-wash">
          <UserX size={28} className="text-alert" />
        </div>
        <h1 className="mt-4 text-center text-[21px] font-extrabold text-ink">
          Paid, then blocked
        </h1>
        <p className="mx-auto mt-2 max-w-[34ch] text-center text-[14px] leading-relaxed text-ink-mute">
          The most common ending to a UPI scam: the money goes out, and the person on the
          other end disappears.
        </p>

        <Card className="mt-6 p-4">
          <ol className="space-y-3">
            {[
              ['You paid', `${inr(AMOUNT)} to Quick Refund Services, three hours ago.`],
              ['They blocked you', 'No replies, no refund, no way to reach them.'],
              ['You report it', 'Four questions, and TrustPay drafts the bank complaint.'],
              ['The money returns', `A ${inr(AMOUNT)} credit lands back in your account.`],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full
                                 bg-ink text-[12px] font-extrabold text-paper">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-ink">{t}</span>
                  <span className="block text-[13px] leading-relaxed text-ink-mute">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {!seeded ? (
          <Button size="lg" className="mt-6 w-full" onClick={seed}>
            <Ban size={16} /> Set up the scenario
          </Button>
        ) : (
          <>
            <Card className="mt-6 flex items-start gap-3 border border-calm/25 p-4">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-calm" />
              <p className="text-[13px] leading-relaxed text-ink-mute">
                <span className="font-bold text-ink">Ready. </span>
                A completed {inr(AMOUNT)} payment is now in your history. Open it, choose
                <span className="font-bold text-ink"> Report fraud</span>, and answer
                <span className="font-bold text-ink"> &ldquo;Yes, they blocked me&rdquo;</span>.
              </p>
            </Card>
            <Button size="lg" className="mt-3 w-full" onClick={() => router.push(`/activity/${seeded}`)}>
              Open the payment <ArrowRight size={16} />
            </Button>
          </>
        )}

        <DemoNote>
          The reversal is a simulated bank-side dispute outcome, not a UPI feature. It only
          fires because the recipient blocked you, the report came within 24 hours, no PIN or
          OTP was shared, and the payment actually completed. Without that corroboration the
          case goes to manual review instead — otherwise anyone could buy something, report
          it, and keep both.
        </DemoNote>
      </div>
    </div>
  );
}
