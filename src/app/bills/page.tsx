'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Wifi, Tv, Smartphone, Droplets, Flame } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, DemoNote, TopBar } from '@/components/ui';
import { PaymentComposer } from '@/components/PaymentComposer';
import { inr } from '@/lib/format';

const BILLS = [
  { id: 'elec', label: 'Electricity', biller: 'TNEB electricity', ref: 'Consumer 4419-2201', amount: 1840, due: 'Due in 4 days', icon: Zap },
  { id: 'net', label: 'Internet', biller: 'ACT Fibernet', ref: 'Account 88120394', amount: 1199, due: 'Due in 9 days', icon: Wifi },
  { id: 'dth', label: 'DTH', biller: 'Tata Play', ref: 'ID 3092114', amount: 449, due: 'Due today', icon: Tv },
  { id: 'post', label: 'Postpaid', biller: 'Airtel postpaid', ref: '+91 98765 43210', amount: 749, due: 'Due in 12 days', icon: Smartphone },
  { id: 'water', label: 'Water', biller: 'CMWSSB water', ref: 'Consumer 77-2201', amount: 310, due: 'Paid', icon: Droplets },
  { id: 'gas', label: 'Gas', biller: 'Indane gas', ref: 'LPG 5520114', amount: 905, due: 'Book refill', icon: Flame },
];

export default function BillsPage() {
  const router = useRouter();
  const { ready } = useStore();
  const [sel, setSel] = useState<typeof BILLS[number] | null>(null);

  if (!ready) return <div className="h-screen" />;

  if (sel) {
    return (
      <div>
        <TopBar title={sel.label} onBack={() => setSel(null)} />
        <PaymentComposer rail="bill" recipient={null} lockedAmount={sel.amount}
          recipientName={sel.biller} recipientHandle={sel.ref} subtitle={sel.ref}
          onExit={() => router.push('/')} />
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <TopBar title="Bills" onBack={() => router.push('/')} />
      <div className="px-5 pt-4">
        <ul className="space-y-2">
          {BILLS.map((b) => (
            <li key={b.id}>
              <button onClick={() => setSel(b)} className="w-full text-left">
                <Card className="flex items-center gap-3 p-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper-sink">
                    <b.icon size={18} className="text-ink" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{b.biller}</p>
                    <p className="truncate text-[12px] text-ink-faint">{b.ref} · {b.due}</p>
                  </div>
                  <p className="tnum shrink-0 text-[14px] font-extrabold text-ink">{inr(b.amount)}</p>
                </Card>
              </button>
            </li>
          ))}
        </ul>
        <DemoNote>
          Biller data is simulated. Bill payments run through the same policy engine, so an
          unusually large bill to a new biller is still checked before it goes out.
        </DemoNote>
      </div>
    </div>
  );
}
