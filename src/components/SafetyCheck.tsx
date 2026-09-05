'use client';
import { useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { inr } from '@/lib/format';


/**
 * Runs after the PIN is accepted and before the payment is sent. Each line is a
 * check the system has genuinely already performed server-side — this screen
 * reports them, it does not decide anything. The delay is deliberate: it is the
 * last moment a user can recognise a mistake, and a payment that pauses for two
 * seconds is still fast enough to feel instant.
 */
export function SafetyCheck({
  amount, recipientName, recipientHandle, purposeLabel, riskScore, limit, onDone,
}: {
  amount: number;
  recipientName: string;
  recipientHandle: string;
  purposeLabel?: string;
  riskScore: number;
  limit: number;
  onDone: () => void;
}) {
  const steps = [
    { label: 'Verifying recipient', detail: `${recipientName} resolved` },
    { label: 'Checking payment pattern', detail: 'Compared with your history' },
    { label: 'Analysing risk signals', detail: `Risk ${riskScore}/100` },
    { label: 'Confirming transfer limit', detail: `Within your ${inr(limit)} limit` },
    { label: 'Applying Guardian policy', detail: 'No approval outstanding' },
  ];
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= steps.length) {
      const t = setTimeout(onDone, 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), done === 0 ? 420 : 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div className="px-5 pt-10 animate-rise">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brass-wash">
        <ShieldCheck size={28} className="text-brass" />
      </div>
      <h1 className="mt-5 text-center text-[22px] font-extrabold text-ink">Safety check</h1>
      <p className="mt-1 text-center text-[13px] text-ink-mute">
        Guardian is securing your payment.
      </p>

      <ul className="mx-auto mt-8 max-w-[330px] space-y-1">
        {steps.map((s, i) => {
          const complete = i < done;
          const active = i === done;
          return (
            <li
              key={s.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-opacity ${
                complete || active ? 'opacity-100' : 'opacity-35'
              }`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center">
                {complete ? (
                  <Check size={18} className="text-calm" strokeWidth={3} />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin text-ink-faint" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-ink/20" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">{s.label}</span>
                {complete && (
                  <span className="block truncate text-[12px] text-ink-faint">{s.detail}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-7 max-w-[330px] rounded-xl bg-ink/[0.04] px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[14px] font-bold text-ink">{recipientName}</p>
          <p className="tnum shrink-0 text-[15px] font-extrabold text-ink">{inr(amount)}</p>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[12px] text-ink-faint">{recipientHandle}</p>
          {purposeLabel && (
            <p className="shrink-0 text-[12px] text-ink-faint">{purposeLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
