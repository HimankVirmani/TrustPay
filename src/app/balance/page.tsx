'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Landmark, RefreshCw } from 'lucide-react';
import { useStore } from '@/lib/store';
import { inr } from '@/lib/format';
import { Card, DemoNote, TopBar } from '@/components/ui';
import { PinPad } from '@/components/PinPad';

export default function BalancePage() {
  const { accounts, activeAccountId, set, ready, user } = useStore();
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [refreshing, setRefreshing] = useState('');
  /** Balances stay hidden until the PIN is re-entered. Someone glancing at an
   *  unlocked phone should not learn what is in the account. */
  const [pinFor, setPinFor] = useState<'all' | string | null>(null);

  if (!ready) return <div className="h-screen" />;

  if (pinFor) {
    return (
      <PinPad
        title="Confirm your PIN"
        subtitle={pinFor === 'all'
          ? 'Balances stay hidden until you confirm it is you.'
          : 'Confirm your PIN to check this account balance.'}
        onCancel={() => setPinFor(null)}
        onSuccess={() => {
          if (pinFor !== 'all') { setRefreshing(pinFor); setTimeout(() => setRefreshing(''), 700); }
          setShown(true);
          setPinFor(null);
        }}
      />
    );
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const mask = (v: number) => (shown ? inr(v) : '₹ • • • • •');

  return (
    <div className="animate-rise">
      <TopBar title="Balance" onBack={() => router.back()} />

      <div className="px-5">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-faint">Total across {accounts.length} accounts</p>
              <p className="tnum mt-1 text-[30px] font-extrabold leading-none text-ink">
                {mask(total)}
              </p>
            </div>
            <button
              onClick={() => (shown ? setShown(false) : setPinFor('all'))}
              aria-label={shown ? 'Hide balances' : 'Show balances'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/12"
            >
              {shown ? <EyeOff size={17} className="text-ink-mute" /> : <Eye size={17} className="text-ink-mute" />}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-ink-faint">
            Test balances. {user.name}&apos;s demo profile — no real bank is connected.
          </p>
        </Card>

        <h2 className="mb-2 mt-6 text-[13px] font-bold text-ink-mute">Your accounts</h2>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brass-wash">
                    <Landmark size={19} className="text-brass" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-ink">{a.bank}</p>
                    <p className="text-[12px] text-ink-faint">
                      •••• {a.last4} · {a.type === 'savings' ? 'Savings' : 'Current'}
                      {a.id === activeAccountId && ' · Default'}
                    </p>
                  </div>
                  <p className="tnum shrink-0 text-[15px] font-extrabold text-ink">{mask(a.balance)}</p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPinFor(a.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/12 py-2.5
                               text-[12px] font-bold text-ink-mute"
                  >
                    <RefreshCw size={14} className={refreshing === a.id ? 'animate-spin' : ''} />
                    {refreshing === a.id ? 'Checking…' : 'Check balance'}
                  </button>
                  <button
                    onClick={() => { set('activeAccountId', a.id); router.push('/pay'); }}
                    className="flex-1 rounded-xl bg-ink py-2.5 text-[12px] font-bold text-paper"
                  >
                    {a.id === activeAccountId ? 'Pay from this' : 'Use for payment'}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <DemoNote>
          Balances are seeded demo data. A production build would read them over an account
          aggregator or bank API, never by storing your net-banking credentials.
        </DemoNote>
      </div>
    </div>
  );
}
