'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, DemoNote, STATE_TONE, inputCls, TopBar } from '@/components/ui';
import { PaymentComposer } from '@/components/PaymentComposer';
import type { Recipient } from '@/lib/types';
import { maskPhone } from '@/lib/format';

function PayInner() {
  const { recipients, findRecipient, ready } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const preAmt = Number(params.get('amt') || 0) || undefined;
  const preMsg = params.get('msg') ?? undefined;
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Recipient | null>(null);
  const [searched, setSearched] = useState<Recipient | null | undefined>(undefined);

  // Demo scenarios deep-link straight to a recipient with an amount and message.
  useEffect(() => {
    const to = params.get('to');
    if (!to || !ready) return;
    // Accept an internal id, a UPI ID or a phone number, so a scenario link and
    // a link someone types by hand both work.
    const key = to.trim().toLowerCase();
    const digits = key.replace(/\D/g, '');
    const r =
      recipients.find((x) => x.id === key) ??
      recipients.find((x) => x.upiId.toLowerCase() === key) ??
      (digits.length >= 10
        ? recipients.find((x) => x.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
        : undefined);
    if (r) setPicked(r);
  }, [params, ready, recipients]);

  if (!ready) return <div className="h-screen" />;

  if (picked) {
    return (
      <div>
        <TopBar title="Pay" onBack={() => setPicked(null)} />
        <PaymentComposer
          rail="upi" recipient={picked}
          recipientName={picked.name} recipientHandle={picked.upiId}
          subtitle={`${picked.upiId} · ${maskPhone(picked.phone)}`}
          initialAmount={preAmt} initialNote={preMsg}
          onExit={() => router.push('/')}
        />
      </div>
    );
  }

  const frequent = recipients.filter((r) => r.paymentsFromUser > 0)
    .sort((a, b) => b.paymentsFromUser - a.paymentsFromUser).slice(0, 5);

  function lookup() {
    const found = findRecipient(q);
    setSearched(found);
  }

  return (
    <div className="animate-fade">
      <TopBar title="Pay anyone" onBack={() => router.push('/')} />
      <div className="px-5 pt-4">
        <div className="flex gap-2">
          <input
            value={q} onChange={(e) => { setQ(e.target.value); setSearched(undefined); }}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="Phone number or UPI ID" className={inputCls} inputMode="text"
            aria-label="Phone number or UPI ID"
          />
          <Button onClick={lookup} className="shrink-0 px-4" aria-label="Look up recipient">
            <Search size={17} />
          </Button>
        </div>
        <DemoNote>
          Try 98765 43221, rahul@upi, or refund.help@upi. Directory is synthetic demo data.
        </DemoNote>

        {searched === null && (
          <Card className="mt-4 p-4">
            <p className="text-[14px] font-bold text-ink">No account found</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
              Check the number or UPI ID. TrustPay will not let you pay an address it cannot resolve.
            </p>
          </Card>
        )}

        {searched && <RecipientCard r={searched} onPick={() => setPicked(searched)} />}
      </div>

      <section className="mt-7 px-5">
        <h2 className="text-[15px] font-extrabold text-ink">People you pay often</h2>
        <ul className="mt-3 space-y-2">
          {frequent.map((r) => (
            <li key={r.id}>
              <button onClick={() => setPicked(r)}
                className="flex w-full items-center gap-3 rounded-xl2 bg-paper-card p-3.5 text-left shadow-lift">
                <Avatar name={r.name} tone={r.avatarTone} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{r.name}</p>
                  <p className="truncate text-[12px] text-ink-faint">{r.upiId}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATE_TONE[r.state].cls}`}>
                  {STATE_TONE[r.state].label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RecipientCard({ r, onPick }: { r: Recipient; onPick: () => void }) {
  return (
    <Card className="mt-4 animate-rise p-4">
      <div className="flex items-center gap-3">
        <Avatar name={r.name} tone={r.avatarTone} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-extrabold text-ink">{r.name}</p>
          <p className="truncate text-[13px] text-ink-faint">{r.upiId}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATE_TONE[r.state].cls}`}>
          {STATE_TONE[r.state].label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Account age" value={r.accountAgeDays > 365
          ? `${Math.floor(r.accountAgeDays / 365)}y` : `${r.accountAgeDays}d`} />
        <Stat label="Completed" value={String(r.successfulTxns)} />
        <Stat label="Reports" value={String(r.reportCount)}
          tone={r.reportCount > 0 ? 'text-alert' : undefined} />
      </dl>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-paper-sink px-3.5 py-2.5">
        <span className="text-[12px] font-semibold text-ink-mute">Trust score</span>
        <span className={`tnum text-[14px] font-extrabold ${r.trustScore >= 70 ? 'text-calm' : r.trustScore >= 40 ? 'text-watch' : 'text-alert'}`}>
          {r.trustScore}/100
        </span>
      </div>

      <p className="mt-2 text-[12px] text-ink-mute">
        {r.paymentsFromUser > 0
          ? `You have paid this recipient ${r.paymentsFromUser} time(s) before.`
          : 'You have never paid this recipient.'}
      </p>

      <Button className="mt-4 w-full" size="lg" onClick={onPick}>Continue</Button>
      <DemoNote>Reputation figures are generated demo data, not a real credit or fraud bureau.</DemoNote>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-paper-sink py-2.5">
      <dd className={`tnum text-[15px] font-extrabold ${tone ?? 'text-ink'}`}>{value}</dd>
      <dt className="mt-0.5 text-[10px] font-semibold text-ink-faint">{label}</dt>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary so the rest of the route can still
 *  be prerendered. Demo scenarios deep-link into this screen via query params. */
export default function PayPage() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <PayInner />
    </Suspense>
  );
}
