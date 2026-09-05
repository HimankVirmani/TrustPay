'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode, Send, Landmark, Smartphone, Receipt, ShieldCheck, Sparkles, ChevronRight, ScanLine, Bell, Wallet, Plane, Zap, Wifi, Flame, Home as HomeIcon, CalendarClock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { GuardianHome } from '@/components/GuardianHome';
import { dueLabel, daysUntil } from '@/lib/reminders';
import { greeting, inr, dayOf, signedAmount } from '@/lib/format';
import { HARD_LIMIT_INR, DEFAULT_LIMIT_INR } from '@/lib/constants';
import { Avatar, Card, RISK_TONE } from '@/components/ui';

const ACTIONS = [
  { href: '/scan', label: 'Scan QR', icon: QrCode },
  { href: '/pay', label: 'Pay anyone', icon: Send },
  { href: '/bank', label: 'Bank transfer', icon: Landmark },
  { href: '/recharge', label: 'Recharge', icon: Smartphone },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/balance', label: 'Check balance', icon: Wallet },
];

export default function HomePage() {
  const { user, transactions, moneyProtected, ready, mode, unreadCount, reminders, userLimit, viewAs, travelMode, travelGuardianId,
    guardians, set } = useStore();
  const router = useRouter();
  const protectedTotal = moneyProtected().total;
  const unread = unreadCount();
  /** Soonest first, unpaid only, capped so the home screen stays scannable. */
  const dueSoon = [...reminders]
    .filter((r) => !r.paid)
    .sort((a, b) => daysUntil(a.dueOn) - daysUntil(b.dueOn))
    .slice(0, 3);
  const recent = transactions.slice(0, 4);

  if (!ready) return <div className="h-screen" />;

  // A Guardian is on duty, not shopping. They get their own screen rather than
  // the payer's home with a different name at the top.
  if (viewAs === 'guardian') return <GuardianHome />;

  return (
    <div className="animate-fade">
      <header className="safe-top bg-ink px-5 pb-16 pt-5">
        <div className="mb-4 flex items-center gap-2">
          <img src="/icons/mark.svg" alt="" width={26} height={26} />
          <span className="text-[15px] font-extrabold tracking-tight text-paper">
            Trust<span className="text-brass-lite">Pay</span>
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-paper/55">{greeting()}</p>
            <h1 className="mt-0.5 text-[22px] font-extrabold text-paper">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/notifications" aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full bg-paper/10">
              <Bell size={19} className="text-paper" strokeWidth={1.9} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center
                                 rounded-full bg-alert px-1 text-[10px] font-extrabold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <Link href="/profile" aria-label="Profile">
              <Avatar name={user.fullName} tone="brass" size={40} />
            </Link>
          </div>
        </div>

        {/* Scan QR lives in the action row now, so the header no longer repeats
            it. The balance itself becomes the tap target for account details. */}
        <div className="mt-5 flex items-end justify-between">
          <Link href="/balance" className="min-w-0">
            <p className="text-[12px] text-paper/50">Test balance</p>
            <p className="tnum mt-0.5 flex items-center gap-1.5 text-[30px] font-extrabold leading-none text-paper">
              {inr(user.balance)}
              <ChevronRight size={20} className="mt-1 text-paper/40" />
            </p>
          </Link>
          <Link href="/balance"
            className="flex items-center gap-2 rounded-full bg-paper/10 px-4 py-2.5 text-[13px] font-bold text-paper">
            <Wallet size={16} /> Accounts
          </Link>
        </div>
      </header>

      <div className="-mt-11 px-5">
        <Link href="/profile/protected">
          <Card className="flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-calm-wash">
              <ShieldCheck size={21} className="text-calm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink">Guardian is watching your payments</p>
              <p className="tnum mt-0.5 text-[12px] text-ink-mute">
                {inr(protectedTotal)} stopped before it left your account
              </p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" />
          </Card>
        </Link>
      </div>

      {/* Six actions in one row. A 6-column grid would crush the labels at
          360px, so the row scrolls horizontally and keeps the requested order. */}
      <nav className="mt-6">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <li key={href} className="shrink-0">
              <Link href={href}
                className="flex h-full w-[84px] flex-col items-center justify-start gap-2 rounded-xl2
                           bg-paper-card px-1 py-3.5 shadow-lift">
                <Icon size={20} className="text-ink" strokeWidth={1.9} />
                <span className="text-center text-[11px] font-bold leading-tight text-ink-mute">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {travelMode && (
        <section className="mt-6 px-5">
          <Card className="border border-brass/30 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass-wash">
                <Plane size={18} className="text-brass" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-ink">You are travelling</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">
                  Checks are tighter, and{' '}
                  {guardians.find((x) => x.id === travelGuardianId)?.name ?? 'your Guardian'}{' '}
                  can approve or pay for you while you are away.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/guardian"
                className="flex-1 rounded-xl border border-ink/12 py-2.5 text-center text-[12px] font-bold text-ink">
                Travel settings
              </Link>
              <button
                onClick={() => {
                  const g = guardians.find((x) => x.id === travelGuardianId) ?? guardians[0];
                  if (!g) return;
                  set('viewAs', 'guardian');
                  set('activeGuardianId', g.id);
                  router.push('/');
                }}
                className="flex-1 rounded-xl bg-ink py-2.5 text-[12px] font-bold text-paper"
              >
                Switch to {guardians.find((x) => x.id === travelGuardianId)?.relation ?? 'Guardian'}
              </button>
            </div>
          </Card>
        </section>
      )}

      {/* Bills come before history: what you still owe is more actionable than
          what you already paid. Sorted by urgency, not by amount. */}
      {dueSoon.length > 0 && (
        <section className="mt-7 px-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Coming up</h2>
            <span className="text-[12px] text-ink-faint">{dueSoon.length} to pay</span>
          </div>
          <ul className="mt-3 space-y-2">
            {dueSoon.map((r) => {
              const due = dueLabel(r.dueOn);
              const Icon = REMINDER_ICON[r.category] ?? Receipt;
              const tone = due.tone === 'alert' ? 'bg-alert-wash text-alert'
                : due.tone === 'watch' ? 'bg-watch-wash text-watch' : 'bg-ink/6 text-ink-mute';
              return (
                <li key={r.id}>
                  <Link href="/bills">
                    <Card className="flex items-center gap-3 p-4">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold text-ink">{r.label}</span>
                        <span className="block truncate text-[12px] text-ink-faint">{r.biller}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block text-[14px] font-extrabold text-ink">{inr(r.amount)}</span>
                        <span className={`block text-[11px] font-bold ${
                          due.tone === 'alert' ? 'text-alert'
                            : due.tone === 'watch' ? 'text-watch' : 'text-ink-faint'}`}>
                          {due.text}
                        </span>
                      </span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-7 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">Transaction history</h2>
          <Link href="/activity" className="text-[12px] font-bold text-brass">See all</Link>
        </div>
        <ul className="mt-3 space-y-2">
          {recent.map((t) => {
            const tone = t.risk ? RISK_TONE[t.risk.level] : null;
            const stopped = t.status === 'blocked' || t.status === 'pending_guardian';
            return (
              <li key={t.id}>
                <Link href={`/activity/${t.id}`} className="flex items-center gap-3 rounded-xl2 bg-paper-card p-3.5 shadow-lift">
                  <Avatar name={t.recipientName} tone={stopped ? 'alert' : 'neutral'} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{t.recipientName}</p>
                    <p className="truncate text-[12px] text-ink-faint">
                      {statusLabel(t.status)} · {dayOf(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`tnum text-[14px] font-extrabold ${stopped ? 'text-ink-faint line-through'
                      : t.direction === 'credit' ? 'text-calm' : 'text-ink'}`}>
                      {signedAmount(t)}
                    </p>
                    {tone && t.risk!.level !== 'low' && (
                      <p className={`tnum text-[11px] font-bold ${tone.text}`}>Risk {t.risk!.score}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 px-5">
        <button onClick={() => router.push('/guardian/ai')}
          className="flex w-full items-center gap-3 rounded-xl2 bg-ink p-4 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass/20">
            <Sparkles size={18} className="text-brass-lite" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-paper">TrustBot</p>
            <p className="text-[12px] text-paper/55">Ask why a payment was flagged</p>
          </div>
          <ChevronRight size={17} className="shrink-0 text-paper/40" />
        </button>
      </section>

      <p className="mt-6 px-5 pb-4 text-center text-[11px] leading-relaxed text-ink-faint">
        Prototype with test data. Your limit is {inr(Math.min(userLimit ?? DEFAULT_LIMIT_INR, HARD_LIMIT_INR))} per payment · protection set to {mode}.
      </p>
    </div>
  );
}

function statusLabel(s: string) {
  return ({
    successful: 'Payment successful', protected: 'Stopped by Guardian',
    blocked: 'Blocked', flagged: 'Reported', failed: 'Failed',
    pending_guardian: 'Waiting for Guardian', recovery: 'In recovery',
  } as Record<string, string>)[s] ?? s;
}

const REMINDER_ICON: Record<string, typeof Zap> = {
  electricity: Zap, mobile: Smartphone, broadband: Wifi,
  gas: Flame, rent: HomeIcon, card: CalendarClock,
};
