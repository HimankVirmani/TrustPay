'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Plane, Users, SlidersHorizontal, BarChart3, PlayCircle,
  RotateCcw, Download, ChevronRight, LockKeyhole,
  Wallet, FileText,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, DemoNote, Sheet } from '@/components/ui';
import { HARD_LIMIT_INR, DEFAULT_LIMIT_INR, PROTECTION_PROFILES, type ProtectionMode } from '@/lib/constants';
import { inr } from '@/lib/format';

const MODES: ProtectionMode[] = ['convenience', 'balanced', 'maximum'];

const SCENARIOS = [
  { n: 1, title: 'Safe payment', body: '₹500 to someone you pay often — low risk, no friction.', href: '/pay?to=r_amit&amt=500&msg=Lunch' },
  { n: 2, title: 'New recipient', body: '₹8,000 to an account you have never paid.', href: '/pay?to=r_kiran&amt=8000&msg=Deposit for the flat' },
  { n: 3, title: 'Social engineering', body: '₹20,000 with an urgent, secretive message.', href: "/pay?to=r_rahul&amt=20000&msg=URGENT! Send immediately. Don't tell anyone." },
  { n: 4, title: 'Reported recipient', body: 'An account carrying seven prior reports.', href: '/pay?to=r_support&amt=12000&msg=Refund processing fee' },
  { n: 5, title: 'Over the limit', body: '₹25,000 — the hard ceiling stops it.', href: '/pay?to=r_amit&amt=25000' },
  { n: 6, title: 'Travel Mode', body: 'Turn on Travel Protection, then pay someone new.', href: '/guardian' },
  { n: 7, title: 'Post-payment fraud', body: 'Report a completed payment and run recovery.', href: '/activity' },
  { n: 8, title: 'False positive', body: '₹18,000 rent — unusual, but trust history keeps it low.', href: '/pay?to=r_landlord&amt=18000&msg=October rent' },
  { n: 9, title: 'Blocked, then refunded', body: 'They took ₹20,000 and blocked you. Report it and watch the money come back.', href: '/demo/blocked' },
];

export default function ProfilePage() {
  const store = useStore();
  const router = useRouter();
  const [demo, setDemo] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  if (!store.ready) return <div className="h-screen" />;
  const p = PROTECTION_PROFILES[store.mode];
  const travelG = store.guardians.find((g) => g.id === store.travelGuardianId);
  const openCases = store.recoveries.filter((c) => !['recovered', 'withdrawn'].includes(c.status)).length;

  return (
    <div className="animate-fade">
      <header className="safe-top flex items-center gap-3 px-5 pt-5">
        <Avatar name={store.user.fullName} tone="brass" size={52} />
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-extrabold text-ink">{store.user.fullName}</h1>
          <p className="truncate text-[13px] text-ink-faint">{store.user.upiId} · {store.user.phone}</p>
        </div>
      </header>

      <section className="mt-6 px-5">
        <h2 className="text-[15px] font-extrabold text-ink">Guardian Center</h2>
        <Card className="mt-3 divide-y divide-ink/6">
          <Row icon={<ShieldCheck size={17} className="text-calm" />} label="Protection status"
            value="Protected" tone="text-calm" />
          <Row icon={<Users size={17} className="text-ink-mute" />} label="Guardian Circle"
            value={store.guardians.map((g) => g.relation).join(', ')} href="/guardian" />
          <Row icon={<Plane size={17} className="text-ink-mute" />} label="Travel Mode"
            value={store.travelMode ? `On — ${travelG?.relation}` : 'Off'} href="/guardian" />
          <Row icon={<SlidersHorizontal size={17} className="text-ink-mute" />} label="Protection preference"
            value={p.label} onClick={() => setModeOpen(true)} />
          <Row icon={<Wallet size={17} className="text-ink-mute" />} label="Payment limit"
            value={`${inr(Math.min(store.userLimit ?? DEFAULT_LIMIT_INR, HARD_LIMIT_INR))} per payment`}
            href="/profile/limit" />
          <Row icon={<ShieldCheck size={17} className="text-ink-mute" />} label="Money protected"
            value={inr(store.moneyProtected().total)} href="/profile/protected" />
          <Row icon={<FileText size={17} className="text-ink-mute" />} label="Fraud complaints"
            value={store.complaints.length
              ? `${store.complaints.length} filed`
              : 'None'}
            href="/profile/complaints" />
          <Row icon={<BarChart3 size={17} className="text-ink-mute" />} label="Recovery cases"
            value={String(openCases)} href="/activity" />
        </Card>
        <DemoNote>
          You choose your own payment limit, and changing it needs your PIN. The system will not
          authorise more than {inr(HARD_LIMIT_INR)} in a single payment under any circumstances.
        </DemoNote>
      </section>

      <section className="mt-6 space-y-2 px-5">
        <Link href="/insights">
          <Card className="flex items-center gap-3 p-4">
            <BarChart3 size={18} className="shrink-0 text-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">How Guardian decides</p>
              <p className="text-[12px] text-ink-mute">Model performance and the threshold trade-off</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" />
          </Card>
        </Link>
        <Link href="/dashboard">
          <Card className="flex items-center gap-3 p-4">
            <BarChart3 size={18} className="shrink-0 text-brass" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">Operations dashboard</p>
              <p className="text-[12px] text-ink-mute">Wide-screen view for reviewers</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" />
          </Card>
        </Link>
        <button onClick={() => setDemo(true)} className="w-full text-left">
          <Card className="flex items-center gap-3 p-4">
            <PlayCircle size={18} className="shrink-0 text-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">Demo scenarios</p>
              <p className="text-[12px] text-ink-mute">Eight one-tap walkthroughs</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" />
          </Card>
        </button>
      </section>

      <section className="mt-6 space-y-2 px-5 pb-10">
        <Button variant="outline" size="lg" className="w-full"
          onClick={() => alert('Use your browser menu: Install app, or Share → Add to Home Screen.')}>
          <Download size={16} /> Install TrustPay
        </Button>
        <Button variant="ghost" className="w-full"
          onClick={() => { if (confirm('Reset all demo data back to its starting state?')) { store.reset(); router.push('/'); } }}>
          <RotateCcw size={15} /> Reset demo data
        </Button>
        <DemoNote>
          Prototype. Test data only, no real money, no real recipients, no stored credentials.
        </DemoNote>
      </section>

      <Sheet open={modeOpen} onClose={() => setModeOpen(false)} title="Protection preference">
        <p className="text-[13px] leading-relaxed text-ink-mute">
          This changes when Guardian steps in — not what it can stop.
        </p>
        <ul className="mt-4 space-y-2">
          {MODES.map((m) => {
            const prof = PROTECTION_PROFILES[m];
            const on = store.mode === m;
            return (
              <li key={m}>
                <button onClick={() => { store.set('mode', m); setModeOpen(false); }}
                  className={`w-full rounded-xl2 p-4 text-left shadow-lift ${on ? 'bg-ink text-paper' : 'bg-paper-card'}`}>
                  <p className={`text-[14px] font-extrabold ${on ? 'text-paper' : 'text-ink'}`}>{prof.label}</p>
                  <p className={`mt-1 text-[12px] leading-relaxed ${on ? 'text-paper/65' : 'text-ink-mute'}`}>
                    {prof.blurb}
                  </p>
                  <p className={`mt-2 text-[11px] ${on ? 'text-paper/50' : 'text-ink-faint'}`}>
                    Verify from {prof.verifyAt} · Guardian from {prof.guardianAt} · approval above {inr(prof.guardianAmount)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 rounded-xl bg-brass-wash px-3.5 py-2.5 text-[12px] font-bold text-brass">
          Your payment limit is identical in every mode.
        </p>
      </Sheet>

      <Sheet open={demo} onClose={() => setDemo(false)} title="Demo scenarios">
        <ul className="space-y-2 pt-1">
          {SCENARIOS.map((s) => (
            <li key={s.n}>
              <button onClick={() => { setDemo(false); router.push(s.href); }}
                className="flex w-full items-start gap-3 rounded-xl2 bg-paper-card p-3.5 text-left shadow-lift">
                <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-paper-sink text-[12px] font-extrabold text-ink-mute">
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold text-ink">{s.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">{s.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

function Row({ icon, label, value, tone, href, onClick }: {
  icon: React.ReactNode; label: string; value: string; tone?: string;
  href?: string; onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[13px] font-semibold text-ink">{label}</span>
      <span className={`shrink-0 text-[13px] font-bold ${tone ?? 'text-ink-mute'}`}>{value}</span>
      {(href || onClick) && <ChevronRight size={15} className="shrink-0 text-ink-faint" />}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}
