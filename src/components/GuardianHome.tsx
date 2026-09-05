'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, Clock, Plane, Send, ShieldCheck, Sparkles, UserCheck, History,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { greeting, inr, dayOf, signedAmount } from '@/lib/format';
import { Avatar, Card, DemoNote } from '@/components/ui';
import { STATUS_LABEL } from '@/lib/labels';

/**
 * What a Guardian sees. Deliberately not the payer's home screen with a
 * different name on it: a Guardian is not shopping, they are on duty. So the
 * balance, the bill reminders and the quick-pay grid all come out, and what
 * they actually need — requests waiting on them — is the first thing on screen.
 */
export function GuardianHome() {
  const store = useStore();
  const router = useRouter();
  const g = store.guardians.find((x) => x.id === store.activeGuardianId);

  const pending = store.approvals
    .filter((a) => a.status === 'pending' && a.guardianId === store.activeGuardianId)
    .map((a) => ({ a, t: store.transactions.find((t) => t.id === a.transactionId) }))
    .filter((x) => x.t);

  const decided = store.approvals
    .filter((a) => a.status !== 'pending' && a.guardianId === store.activeGuardianId)
    .slice(0, 3)
    .map((a) => ({ a, t: store.transactions.find((t) => t.id === a.transactionId) }))
    .filter((x) => x.t);

  const stopped = store.transactions.filter((t) => t.status === 'blocked');
  const protectedTotal = stopped.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-fade">
      <header className="bg-ink px-5 pb-14 pt-5">
        <div className="mb-4 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/mark.svg" alt="" width={26} height={26} />
          <span className="text-[15px] font-extrabold tracking-tight text-paper">
            Trust<span className="text-brass-lite">Pay</span>
            <span className="ml-2 rounded-full bg-brass/25 px-2 py-0.5 text-[10px] font-bold
                             uppercase tracking-wide text-brass-lite">
              Guardian
            </span>
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[13px] text-paper/55">{greeting()}</p>
            <h1 className="mt-0.5 truncate text-[22px] font-extrabold text-paper">
              {g?.name ?? 'Guardian'}
            </h1>
            <p className="mt-1 text-[12px] text-paper/50">
              You are {store.user.name}&apos;s {g?.relation ?? 'Guardian'}
            </p>
          </div>
          <Avatar name={g?.name ?? 'Guardian'} tone="brass" size={44} />
        </div>

        <div className="mt-5 flex gap-2">
          <div className="flex-1 rounded-xl bg-paper/[0.08] px-3 py-2.5">
            <p className="tnum text-[19px] font-extrabold leading-none text-paper">{pending.length}</p>
            <p className="mt-1 text-[11px] text-paper/50">Waiting on you</p>
          </div>
          <div className="flex-1 rounded-xl bg-paper/[0.08] px-3 py-2.5">
            <p className="tnum text-[19px] font-extrabold leading-none text-paper">{inr(protectedTotal)}</p>
            <p className="mt-1 text-[11px] text-paper/50">Stopped so far</p>
          </div>
        </div>
      </header>

      <div className="-mt-9 px-5">
        <Link href="/guardian/approvals">
          <Card className="flex items-center gap-3 p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              pending.length ? 'bg-brass-wash' : 'bg-calm-wash'}`}>
              {pending.length
                ? <Clock size={20} className="text-brass" />
                : <ShieldCheck size={20} className="text-calm" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold text-ink">
                {pending.length
                  ? `${pending.length} payment${pending.length > 1 ? 's' : ''} need${pending.length > 1 ? '' : 's'} you`
                  : 'Nothing waiting'}
              </span>
              <span className="block text-[12px] leading-relaxed text-ink-mute">
                {pending.length
                  ? `${store.user.name} is waiting on your decision.`
                  : `${store.user.name}'s payments are going through normally.`}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" />
          </Card>
        </Link>
      </div>

      {store.travelMode && (
        <section className="mt-5 px-5">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass-wash">
                <Plane size={18} className="text-brass" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-ink">
                  {store.user.name} is travelling
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-mute">
                  Thresholds are tighter while they are away, and you can send a payment on
                  their behalf if they cannot.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/pay')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3
                         text-[13px] font-bold text-paper"
            >
              <Send size={15} /> Pay on {store.user.name}&apos;s behalf
            </button>
          </Card>
        </section>
      )}

      {decided.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="text-[15px] font-extrabold text-ink">Your recent decisions</h2>
          <ul className="mt-3 space-y-2">
            {decided.map(({ a, t }) => (
              <li key={a.id}>
                <Link href={`/activity/${t!.id}`}>
                  <Card className="flex items-center gap-3 p-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      a.status === 'approved' ? 'bg-calm-wash' : 'bg-alert-wash'}`}>
                      <UserCheck size={17} className={
                        a.status === 'approved' ? 'text-calm' : 'text-alert'} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">
                        {t!.recipientName}
                      </span>
                      <span className="block text-[12px] text-ink-faint">
                        You {a.status} · {dayOf(a.decidedAt ?? a.requestedAt)}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-[14px] font-extrabold text-ink">
                      {inr(t!.amount)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">
            {store.user.name}&apos;s activity
          </h2>
          <Link href="/activity" className="text-[12px] font-bold text-brass">See all</Link>
        </div>
        <ul className="mt-3 space-y-2">
          {store.transactions.slice(0, 3).map((t) => (
            <li key={t.id}>
              <Link href={`/activity/${t.id}`}>
                <Card className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/6">
                    <History size={17} className="text-ink-mute" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-ink">
                      {t.recipientName}
                    </span>
                    <span className="block text-[12px] text-ink-faint">
                      {STATUS_LABEL[t.status]} · {dayOf(t.createdAt)}
                    </span>
                  </span>
                  <span className={`tnum shrink-0 text-[14px] font-extrabold ${
                    t.status === 'blocked' ? 'text-ink-faint line-through'
                      : t.direction === 'credit' ? 'text-calm' : 'text-ink'}`}>
                    {signedAmount(t)}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-5">
        <Link href="/guardian/ai">
          {/* Not <Card>: its own paper background wins over a bg-ink class and
              the tile rendered washed out. Plain div, explicit styling. */}
          <div className="flex items-center gap-3 rounded-xl2 bg-ink p-4 shadow-lift">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper/10">
              <Sparkles size={17} className="text-brass-lite" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold text-paper">TrustBot</span>
              <span className="block text-[12px] text-paper/55">
                Ask why a payment was held
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-paper/40" />
          </div>
        </Link>
      </section>

      <DemoNote>
        You are viewing {store.user.name}&apos;s account as their {g?.relation ?? 'Guardian'}.
        You can approve, reject and see activity — you cannot change their limit, their
        protection mode or their Guardian Circle.
      </DemoNote>
    </div>
  );
}
