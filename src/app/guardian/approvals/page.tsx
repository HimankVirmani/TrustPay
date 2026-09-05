'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, DemoNote, Empty, RISK_TONE, TopBar, inputCls } from '@/components/ui';
import { inr } from '@/lib/format';

export default function ApprovalsPage() {
  const store = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  /** Set once a decision lands, so the Guardian gets an explicit way back to the
   *  payer's view rather than being stranded in someone else's account. */
  const [done, setDone] = useState<{ txnId: string; outcome: 'approved' | 'rejected'; ok: boolean } | null>(null);
  const [reason, setReason] = useState('');

  if (!store.ready) return <div className="h-screen" />;

  const guardian = store.guardians.find((g) => g.id === store.activeGuardianId);
  const pending = store.approvals
    .filter((a) => a.status === 'pending' && a.guardianId === store.activeGuardianId)
    .map((a) => ({ a, t: store.transactions.find((t) => t.id === a.transactionId) }))
    .filter((x) => x.t);

  async function decide(approvalId: string, txnId: string, amount: number, outcome: 'approved' | 'rejected') {
    setBusy(approvalId);
    // The Guardian's decision goes to the server, which mints a single-use token.
    const res = await fetch('/api/guardian/decide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txnId, amount, guardianId: store.activeGuardianId, outcome }),
    }).then((r) => r.json()).catch(() => null);

    store.decideApproval(approvalId, outcome, reason || undefined);

    if (outcome === 'approved' && res?.token) {
      const txn = store.transactions.find((t) => t.id === txnId);
      const recipient = store.recipients.find((r) => r.id === txn?.recipientId);
      // Approval alone does not send money -- the payment is re-run through the
      // full pipeline, now presenting the token.
      const exec = await fetch('/api/payments/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnId, amount, note: txn?.note, rail: txn?.rail ?? 'upi',
          recipient: recipient ?? null, recipientName: txn?.recipientName,
          recipientHandle: txn?.recipientHandle,
          userAveragePayment: store.user.averagePayment,
          recentTransactions: store.transactions.slice(0, 30),
          mode: store.mode, travelMode: store.travelMode,
          travelGuardianId: store.travelGuardianId, guardians: store.guardians,
          approvalToken: res.token,
        }),
      }).then((r) => r.json()).catch(() => null);

      let ok = false;
      if (exec?.ok) {
        ok = true;
        store.updateTransaction(txnId, { status: 'successful' },
          { at: new Date().toISOString(), event: 'Payment completed after Guardian approval', actor: 'adapter', detail: exec.reference });
        store.set('user', { ...store.user, balance: store.user.balance - amount });
        if (recipient) store.upsertRecipient({ ...recipient, paymentsFromUser: recipient.paymentsFromUser + 1 });
      }
      setDone({ txnId, outcome, ok });
    } else {
      setDone({ txnId, outcome, ok: false });
    }
    setBusy(null); setReason('');
  }

  // After a decision the Guardian is looking at someone else's account. Give
  // them an explicit way back rather than leaving them stranded there.
  if (done) {
    const approved = done.outcome === 'approved';
    return (
      <div className="px-5 pt-10 animate-rise">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
          approved ? 'bg-calm' : 'bg-alert'}`}>
          {approved ? <Check size={30} className="text-white" strokeWidth={3} />
            : <X size={28} className="text-white" strokeWidth={3} />}
        </div>
        <h1 className="mt-5 text-center text-[21px] font-extrabold text-ink">
          {approved ? 'You approved this payment' : 'You stopped this payment'}
        </h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-center text-[14px] leading-relaxed text-ink-mute">
          {approved
            ? `The payment has been sent and ${store.user.name} can see the receipt.`
            : `Nothing left ${store.user.name}'s account. They will see why you stopped it.`}
        </p>

        <div className="mt-8 space-y-2">
          <Button size="lg" className="w-full" onClick={() => {
            store.set('viewAs', 'user');
            router.push(`/activity/${done.txnId}`);
          }}>
            Switch back to {store.user.name}&apos;s view <ArrowRight size={16} />
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setDone(null)}>
            Stay here and review other requests
          </Button>
        </div>

        <DemoNote>
          Guardian Mode switches roles on this one device so the whole approval loop can be shown.
          In production the request would arrive on your Guardian&apos;s own phone.
        </DemoNote>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <TopBar title={`${guardian?.relation ?? 'Guardian'} — approvals`} onBack={() => router.push('/guardian')} />

      <div className="px-5 pt-2">
        {pending.length === 0 ? (
          <Empty title="Nothing waiting"
            body={`No payments need ${guardian?.relation ?? 'a Guardian'} right now. When one does, it will appear here with the amount, the recipient and the reasons Guardian stopped.`}
            action={<Button variant="outline" onClick={() => { store.set('viewAs', 'user'); router.push('/'); }}>
              Back to my account</Button>} />
        ) : (
          <ul className="space-y-3">
            {pending.map(({ a, t }) => {
              const tone = t!.risk ? RISK_TONE[t!.risk.level] : null;
              return (
                <li key={a.id}>
                  <Card className="p-4">
                    <p className="text-[14px] leading-relaxed text-ink">
                      <span className="font-extrabold">{store.user.name}</span> wants to send{' '}
                      <span className="tnum font-extrabold">{inr(t!.amount)}</span> to{' '}
                      <span className="font-extrabold">{t!.recipientName}</span>.
                    </p>

                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper-sink p-3">
                      <Avatar name={t!.recipientName} tone="alert" size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-ink">{t!.recipientName}</p>
                        <p className="truncate text-[11px] text-ink-faint">{t!.recipientHandle}</p>
                      </div>
                      {tone && (
                        <span className={`tnum shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${tone.bg} ${tone.text}`}>
                          {t!.risk!.score}/100
                        </span>
                      )}
                    </div>

                    {t!.note && (
                      <p className="mt-3 rounded-xl bg-paper-sink px-3 py-2 text-[12px] italic text-ink-mute">
                        &ldquo;{t!.note}&rdquo;
                      </p>
                    )}

                    <h3 className="mt-4 text-[12px] font-extrabold text-ink-mute">Why this was held</h3>
                    <ul className="mt-1.5 space-y-1">
                      {t!.risk?.factors.filter((f) => f.points > 0).slice(0, 4).map((f) => (
                        <li key={f.code} className="text-[12px] leading-relaxed text-ink-mute">• {f.label}</li>
                      ))}
                      {t!.policy?.reasons.map((r, i) => (
                        <li key={i} className="text-[12px] leading-relaxed text-ink-mute">• {r}</li>
                      ))}
                    </ul>

                    <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 120))}
                      placeholder="Add a note for them (optional)" className={`${inputCls} mt-4 h-11 text-[13px]`} />

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="danger" size="lg" disabled={busy === a.id}
                        onClick={() => decide(a.id, t!.id, t!.amount, 'rejected')}>
                        <X size={16} /> Reject
                      </Button>
                      <Button variant="calm" size="lg" disabled={busy === a.id}
                        onClick={() => decide(a.id, t!.id, t!.amount, 'approved')}>
                        <Check size={16} /> Approve
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        <DemoNote>
          Approving does not send the money by itself. The server issues a single-use token bound
          to this exact payment and amount, and the payment is then re-checked through the full
          pipeline before anything moves.
        </DemoNote>
      </div>
    </div>
  );
}
