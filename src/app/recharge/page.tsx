'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, Card, DemoNote, Field, TopBar, inputCls } from '@/components/ui';
import { PaymentComposer } from '@/components/PaymentComposer';
import { inr } from '@/lib/format';

const OPERATORS = ['Airtel', 'Jio', 'Vi', 'BSNL'];
const PLANS = [
  { amount: 199, data: '1.5 GB/day', validity: '24 days' },
  { amount: 299, data: '2 GB/day', validity: '28 days' },
  { amount: 479, data: '1.5 GB/day', validity: '56 days' },
  { amount: 999, data: '2.5 GB/day', validity: '84 days' },
];

export default function RechargePage() {
  const router = useRouter();
  const { user, ready } = useStore();
  const [phone, setPhone] = useState(user.phone.replace(/\D/g, '').slice(-10));
  const [op, setOp] = useState('Airtel');
  const [plan, setPlan] = useState<number | null>(null);
  const [go, setGo] = useState(false);

  if (!ready) return <div className="h-screen" />;

  if (go && plan) {
    return (
      <div>
        <TopBar title="Recharge" onBack={() => setGo(false)} />
        <PaymentComposer rail="recharge" recipient={null} lockedAmount={plan}
          recipientName={`${op} prepaid`} recipientHandle={`+91 ${phone}`}
          subtitle={`+91 ${phone}`} onExit={() => router.push('/')} />
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <TopBar title="Mobile recharge" onBack={() => router.push('/')} />
      <div className="space-y-4 px-5 pt-4">
        <Field label="Mobile number">
          <input value={phone} inputMode="numeric" className={inputCls} placeholder="10-digit number"
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </Field>

        <div>
          <span className="text-[13px] font-semibold text-ink-mute">Operator</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {OPERATORS.map((o) => (
              <button key={o} onClick={() => setOp(o)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold ${op === o ? 'bg-ink text-paper' : 'border border-ink/12 text-ink-mute'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[13px] font-semibold text-ink-mute">Choose a plan</span>
          <ul className="mt-2 space-y-2">
            {PLANS.map((p) => (
              <li key={p.amount}>
                <button onClick={() => setPlan(p.amount)}
                  className={`flex w-full items-center justify-between rounded-xl2 p-3.5 text-left shadow-lift ${plan === p.amount ? 'bg-ink text-paper' : 'bg-paper-card'}`}>
                  <span>
                    <span className={`block text-[14px] font-extrabold ${plan === p.amount ? 'text-paper' : 'text-ink'}`}>
                      {inr(p.amount)}
                    </span>
                    <span className={`text-[12px] ${plan === p.amount ? 'text-paper/60' : 'text-ink-faint'}`}>
                      {p.data} · {p.validity}
                    </span>
                  </span>
                  <span className={`text-[12px] font-bold ${plan === p.amount ? 'text-brass-lite' : 'text-brass'}`}>
                    {plan === p.amount ? 'Selected' : 'Select'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Card className="flex items-start gap-3 p-3.5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-calm" />
          <p className="text-[12px] leading-relaxed text-ink-mute">
            <span className="font-bold text-ink">Guardian safety check.</span> Recharges to a number
            that is not yours, or an unusually large plan, get the same second look as a payment.
          </p>
        </Card>

        <Button size="lg" className="w-full" disabled={!plan || phone.length !== 10}
          onClick={() => setGo(true)}>
          {plan ? `Recharge ${inr(plan)}` : 'Choose a plan'}
        </Button>
        <DemoNote>Recharge fulfilment is simulated. No operator is contacted.</DemoNote>
      </div>
    </div>
  );
}
