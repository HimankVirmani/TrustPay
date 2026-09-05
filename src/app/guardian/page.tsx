'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plane, ShieldCheck, UserPlus, ChevronRight, Sparkles, MessageSquareWarning, Network } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, DemoNote, Sheet } from '@/components/ui';
import { DEFAULT_LIMIT_INR, HARD_LIMIT_INR, PROTECTION_PROFILES } from '@/lib/constants';
import { inr } from '@/lib/format';

export default function GuardianPage() {
  const store = useStore();
  const limitNow = Math.min(store.userLimit ?? DEFAULT_LIMIT_INR, HARD_LIMIT_INR);
  const [travelOpen, setTravelOpen] = useState(false);
  const pending = store.approvals.filter((a) => a.status === 'pending');

  if (!store.ready) return <div className="h-screen" />;
  const travelG = store.guardians.find((g) => g.id === store.travelGuardianId);

  return (
    <div className="animate-fade">
      <header className="safe-top px-5 pt-5">
        <h1 className="text-[24px] font-extrabold text-ink">Guardian</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
          The people and rules that check your payments.
        </p>
      </header>

      <div className="mt-5 space-y-3 px-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-calm-wash">
              <ShieldCheck size={21} className="text-calm" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-ink">Protection is on</p>
              <p className="text-[12px] text-ink-mute">
                {PROTECTION_PROFILES[store.mode].label} · your limit {inr(limitNow)} per payment
              </p>
            </div>
          </div>
        </Card>

        {pending.length > 0 && (
          <Link href="/guardian/approvals">
            <Card className="flex items-center gap-3 border border-brass/30 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brass-wash text-[15px] font-extrabold text-brass">
                {pending.length}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-ink">Waiting for a decision</p>
                <p className="text-[12px] text-ink-mute">Review payments held for approval</p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-ink-faint" />
            </Card>
          </Link>
        )}

        <button onClick={() => setTravelOpen(true)} className="w-full text-left">
          <Card className={`flex items-center gap-3 p-4 ${store.travelMode ? 'border border-brass/40' : ''}`}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brass-wash">
              <Plane size={19} className="text-brass" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-ink">
                {store.travelMode ? 'Travel Protection is on' : "I'm travelling"}
              </p>
              <p className="text-[12px] text-ink-mute">
                {store.travelMode
                  ? `${travelG?.relation ?? 'Someone'} is watching your payments`
                  : 'Stricter checks while you are away'}
              </p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" />
          </Card>
        </button>
      </div>

      <section className="mt-6 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">Your Guardian Circle</h2>
          <span className="text-[12px] text-ink-faint">{store.guardians.length} people</span>
        </div>
        <ul className="mt-3 space-y-2">
          {store.guardians.map((g) => (
            <li key={g.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={g.name} tone={g.avatarTone} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-ink">{g.relation}</p>
                    <p className="truncate text-[12px] text-ink-faint">{g.name}</p>
                  </div>
                  <button
                    onClick={() => { store.set('viewAs', 'guardian'); store.set('activeGuardianId', g.id); }}
                    className="shrink-0 rounded-full border border-ink/12 px-3 py-1.5 text-[11px] font-bold text-ink-mute">
                    View as {g.relation}
                  </button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {g.approvesAboveAmount != null && <Rule>Payments over {inr(g.approvesAboveAmount)}</Rule>}
                  {g.approvesHighRisk && <Rule>High-risk payments</Rule>}
                  {g.approvesNewRecipients && <Rule>New recipients</Rule>}
                  {g.approvesTravelPayments && <Rule>Travel payments</Rule>}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="mt-3 w-full" size="lg"
          onClick={() => alert('Adding a Guardian would send them an invite. Not wired up in this prototype.')}>
          <UserPlus size={16} /> Add someone
        </Button>
      </section>

      <section className="mt-6 space-y-2 px-5 pb-8">
        <Link href="/guardian/ai">
          <Card className="flex items-center gap-3 p-4">
            <Sparkles size={19} className="shrink-0 text-brass" />
            <p className="flex-1 text-[14px] font-bold text-ink">Ask TrustBot</p>
            <ChevronRight size={17} className="text-ink-faint" />
          </Card>
        </Link>
        <Link href="/shield">
          <Card className="flex items-center gap-3 p-4">
            <MessageSquareWarning size={19} className="shrink-0 text-alert" />
            <p className="flex-1 text-[14px] font-bold text-ink">Check a message with Scam Shield</p>
            <ChevronRight size={17} className="text-ink-faint" />
          </Card>
        </Link>
        <Link href="/insights">
          <Card className="flex items-center gap-3 p-4">
            <Network size={19} className="shrink-0 text-ink" />
            <p className="flex-1 text-[14px] font-bold text-ink">How Guardian decides</p>
            <ChevronRight size={17} className="text-ink-faint" />
          </Card>
        </Link>
      </section>

      <Sheet open={travelOpen} onClose={() => setTravelOpen(false)} title="Travel Protection">
        <p className="text-[13px] leading-relaxed text-ink-mute">
          While you are away, Guardian tightens every threshold: new recipients need stronger
          verification, anything above low risk needs approval, and Scam Shield stays on.
        </p>
        <p className="mt-3 rounded-xl bg-brass-wash px-3.5 py-2.5 text-[12px] font-bold text-brass">
          Your {inr(limitNow)} payment limit stays exactly the same. Travel Protection can
          only make checks stricter, never looser.
        </p>
        {store.travelMode ? (
          <>
            <p className="mt-4 text-[13px] font-bold text-ink">
              Current Travel Guardian: {travelG?.relation} ({travelG?.name})
            </p>
            <Button variant="outline" size="lg" className="mt-4 w-full"
              onClick={() => { store.set('travelMode', false); setTravelOpen(false); }}>
              Turn off Travel Protection
            </Button>
          </>
        ) : (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">
              Who should protect your payments while you are away?
            </p>
            <ul className="mt-2 space-y-2">
              {store.guardians.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => {
                      store.set('travelGuardianId', g.id);
                      store.set('travelMode', true);
                      setTravelOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl2 bg-paper-card p-3.5 text-left shadow-lift">
                    <Avatar name={g.name} tone={g.avatarTone} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-ink">{g.relation}</span>
                      <span className="block truncate text-[12px] text-ink-faint">{g.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <DemoNote>Location is not tracked. Travel Protection is a setting you turn on yourself.</DemoNote>
      </Sheet>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return <li className="rounded-full bg-paper-sink px-2.5 py-1 text-[11px] font-bold text-ink-mute">{children}</li>;
}
