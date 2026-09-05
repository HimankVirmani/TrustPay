'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { inr } from '@/lib/format';
import { HARD_LIMIT_INR, DEFAULT_LIMIT_INR } from '@/lib/constants';
import { Button, Card, DemoNote, TopBar } from '@/components/ui';
import { PinPad } from '@/components/PinPad';

const PRESETS = [5_000, 10_000, 20_000, 30_000, 50_000, 100_000];

export default function LimitPage() {
  const { userLimit, set, ready } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState(String(userLimit ?? DEFAULT_LIMIT_INR));
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!ready) return <div className="h-screen" />;

  const value = Number(draft || 0);
  const valid = value >= 100 && value <= HARD_LIMIT_INR;
  const tooHigh = value > HARD_LIMIT_INR;

  // Raising your own ceiling needs the PIN. Lowering it does not — making
  // yourself safer should never be the harder action.
  const raising = value > (userLimit ?? DEFAULT_LIMIT_INR);

  function commit() {
    set('userLimit', Math.min(value, HARD_LIMIT_INR));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  if (confirming) {
    return (
      <PinPad
        title="Confirm your PIN"
        subtitle={`Raising your payment limit to ${inr(value)} needs your PIN.`}
        onCancel={() => setConfirming(false)}
        onSuccess={() => { setConfirming(false); commit(); }}
      />
    );
  }

  return (
    <div className="animate-rise">
      <TopBar title="Payment limit" onBack={() => router.back()} />

      <div className="px-5">
        <Card className="p-5">
          <p className="text-[12px] text-ink-faint">Most you can send in one payment</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[24px] font-extrabold text-ink-faint">₹</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              inputMode="numeric"
              className="tnum w-full bg-transparent text-[34px] font-extrabold leading-none text-ink outline-none"
            />
          </div>

          <ul className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <li key={p}>
                <button
                  onClick={() => setDraft(String(p))}
                  className={`tnum rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                    value === p
                      ? 'border-ink bg-ink text-paper'
                      : 'border-ink/15 text-ink-mute'}`}
                >
                  {inr(p)}
                </button>
              </li>
            ))}
          </ul>

          {tooHigh && (
            <p className="mt-4 rounded-xl bg-alert-wash px-3 py-2.5 text-[12px] leading-relaxed text-alert">
              <span className="font-bold">Not possible. </span>
              {inr(HARD_LIMIT_INR)} is the most the system will authorise in one payment.
              Choose any amount up to that.
            </p>
          )}
          {!tooHigh && value > 0 && value < 100 && (
            <p className="mt-4 text-[12px] font-semibold text-watch">Set at least ₹100.</p>
          )}
        </Card>

        <Card className="mt-3 flex items-start gap-3 p-4">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/6">
            <Lock size={16} className="text-ink-mute" />
          </span>
          <p className="text-[12px] leading-relaxed text-ink-mute">
            Set this to whatever suits you. Raising it needs your PIN, because that is the
            direction someone holding your unlocked phone would want to move it. The server
            independently caps every payment at {inr(HARD_LIMIT_INR)}, so even a tampered
            request cannot go higher.
          </p>
        </Card>

        <div className="mt-5 space-y-2">
          <Button size="lg" className="w-full" disabled={!valid}
            onClick={() => (raising ? setConfirming(true) : commit())}>
            {saved ? 'Saved' : raising ? 'Confirm with PIN' : 'Save limit'}
          </Button>
          {saved && (
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-calm">
              <Check size={15} /> Limit set to {inr(Math.min(value, HARD_LIMIT_INR))}
            </p>
          )}
        </div>

        <DemoNote>
          Lowering your limit is instant. Raising it asks for your PIN. Every payment is still
          scored and may still need a Guardian, whatever your limit says.
        </DemoNote>
      </div>
    </div>
  );
}
