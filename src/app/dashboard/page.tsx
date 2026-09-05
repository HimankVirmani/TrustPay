'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMetrics, FEATURE_LABELS } from '@/lib/useMetrics';
import { inr, stamp, dayOf } from '@/lib/format';
import { HARD_LIMIT_INR } from '@/lib/constants';
import { FraudNetwork } from '@/components/FraudNetwork';

export default function DashboardPage() {
  const store = useStore();
  const { metrics } = useMetrics();
  const [t, setT] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const threshold = t ?? metrics?.default_threshold ?? 50;
  const row = metrics?.threshold_sweep.find((s) => s.threshold === threshold);
  const best = metrics ? metrics.models[metrics.selected_model] : null;

  const analysed = store.transactions.filter((x) => x.risk).length;
  const risky = store.transactions.filter((x) => x.risk && x.risk.level !== 'low').length;
  const blocked = store.transactions.filter((x) => x.status === 'blocked').length;
  const approvals = store.approvals.length;
  const protectedTotal = store.moneyProtected().total;
  const recovered = store.moneyRecovered();

  const factorCounts = useMemo(() => {
    const m = new Map<string, { label: string; n: number; pts: number }>();
    store.transactions.forEach((tx) => tx.risk?.factors.filter((f) => f.points > 0).forEach((f) => {
      const e = m.get(f.code) ?? { label: f.label, n: 0, pts: 0 };
      e.n += 1; e.pts += f.points; m.set(f.code, e);
    }));
    return Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, 6)
      .map((e) => ({ name: e.label.length > 26 ? e.label.slice(0, 24) + '…' : e.label, count: e.n }));
  }, [store.transactions]);

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    store.transactions.forEach((tx) => {
      if (!tx.risk) return;
      buckets[Math.min(4, Math.floor(tx.risk.score / 20))] += 1;
    });
    return buckets.map((v, i) => ({ band: `${i * 20}–${i * 20 + 19}`, count: v }));
  }, [store.transactions]);

  const auditRows = useMemo(() => {
    const rows = store.transactions.flatMap((tx) =>
      tx.audit.map((e) => ({ ...e, txn: tx.id, who: tx.recipientName, amount: tx.amount })));
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !needle || `${r.event} ${r.detail ?? ''} ${r.who} ${r.txn} ${r.actor}`.toLowerCase().includes(needle))
      .sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 60);
  }, [store.transactions, q]);

  const chartData = metrics?.threshold_sweep.filter((s) => s.threshold % 2 === 0).map((s) => ({
    threshold: s.threshold,
    Precision: Math.round(s.precision * 100),
    Recall: Math.round(s.recall * 100),
    'False positive rate': Math.round(s.false_positive_rate * 100),
  })) ?? [];

  if (!store.ready) return <div className="min-h-screen bg-paper" />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/8 bg-ink px-6 py-4 lg:px-10">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-paper/10 text-paper">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-[18px] font-extrabold text-paper">Guardian operations</h1>
            <p className="text-[12px] text-paper/55">
              Prototype instance · synthetic data · system maximum {inr(HARD_LIMIT_INR)} per transaction
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Kpi label="Transactions analysed" value={String(analysed)} />
          <Kpi label="Risky transactions" value={String(risky)} tone="text-watch" />
          <Kpi label="Payments blocked" value={String(blocked)} tone="text-alert" />
          <Kpi label="Guardian approvals" value={String(approvals)} />
          <Kpi label="Fraud reports" value={String(store.reports.length)} tone="text-alert" />
          <Kpi label="Money protected" value={inr(protectedTotal, { compact: true })} tone="text-calm" />
          <Kpi label="Money recovered" value={inr(recovered, { compact: true })} tone="text-calm" />
        </section>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <Panel title="Model performance"
            sub={metrics ? `${metrics.selected_model} · held-out test set of ${metrics.dataset.test_rows}` : 'Run ml/train.py'}>
            {best ? (
              <>
                <dl className="grid grid-cols-4 gap-2 text-center">
                  <Metric label="Precision" value={`${Math.round(best.precision * 100)}%`} />
                  <Metric label="Recall" value={`${Math.round(best.recall * 100)}%`} />
                  <Metric label="F1" value={best.f1.toFixed(2)} />
                  <Metric label="AUC" value={best.roc_auc.toFixed(2)} />
                </dl>
                <table className="mt-4 w-full text-[12px]">
                  <tbody>
                    <tr>
                      <Td className="bg-calm/10 font-bold text-calm">{best.confusion_matrix.tp} caught</Td>
                      <Td className="bg-alert/10 font-bold text-alert">{best.confusion_matrix.fn} missed</Td>
                    </tr>
                    <tr>
                      <Td className="bg-watch/10 font-bold text-watch">{best.confusion_matrix.fp} false alarms</Td>
                      <Td className="bg-ink/5 font-bold text-ink-mute">{best.confusion_matrix.tn} cleared</Td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">{metrics!.disclaimer}</p>
              </>
            ) : <Skeleton />}
          </Panel>

          <Panel title="Threshold simulator" sub="Recomputed live from the held-out set" className="xl:col-span-2">
            {metrics && row ? (
              <>
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="tnum text-[32px] font-extrabold leading-none text-ink">{threshold}</p>
                    <p className="text-[11px] text-ink-faint">flag threshold</p>
                  </div>
                  <Stat k="Precision" v={`${Math.round(row.precision * 100)}%`} />
                  <Stat k="Recall" v={`${Math.round(row.recall * 100)}%`} />
                  <Stat k="False positives" v={String(row.false_positives)} tone="text-watch" />
                  <Stat k="False negatives" v={String(row.false_negatives)} tone="text-alert" />
                  <Stat k="Estimated cost" v={inr(row.total_cost)} />
                </div>
                <input type="range" min={0} max={100} value={threshold} aria-label="Threshold"
                  onChange={(e) => setT(Number(e.target.value))}
                  className="mt-4 w-full accent-[#A8763A]" />
                <div className="mt-3 h-[190px]">
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -24 }}>
                      <CartesianGrid stroke="#12212F" strokeOpacity={0.07} vertical={false} />
                      <XAxis dataKey="threshold" tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <ReferenceLine x={threshold} stroke="#A8763A" strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="Precision" stroke="#17795C" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="Recall" stroke="#B23A2F" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="False positive rate" stroke="#D2830E" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                  {metrics.cost_model.why_not_cost_optimal}
                </p>
              </>
            ) : <Skeleton />}
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel title="Top risk factors" sub="Across this instance's transactions">
            <div className="h-[220px]">
              <ResponsiveContainer>
                <BarChart data={factorCounts} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#12212F" strokeOpacity={0.06} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: '#3A526A' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#A8763A" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Risk distribution" sub="Scores grouped into bands">
            <div className="h-[220px]">
              <ResponsiveContainer>
                <BarChart data={distribution} margin={{ left: -22, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#12212F" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#12212F" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Recovery" sub="Simulated dispute workflow">
            <dl className="space-y-2">
              <KV k="Active cases" v={String(store.recoveries.filter((c) => !['recovered', 'withdrawn'].includes(c.status)).length)} />
              <KV k="Amount at risk" v={inr(store.recoveries.filter((c) => c.status !== 'recovered').reduce((a, c) => a + c.amount, 0))} />
              <KV k="Amount recovered" v={inr(recovered)} tone="text-calm" />
              <KV k="Recovery rate" v={store.recoveries.length
                ? `${Math.round(store.recoveries.filter((c) => c.status === 'recovered').length / store.recoveries.length * 100)}%`
                : '—'} />
              <KV k="Awaiting manual review" v={String(store.recoveries.filter((c) => c.status === 'manual_review').length)} />
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Recovery outcomes are simulated. Real UPI transfers are not generally reversible once settled.
            </p>
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <Panel title="Fraud network" sub="Synthetic accounts linked by shared risk signals">
            <FraudNetwork />
          </Panel>

          <Panel title="Feature weights" sub={metrics ? `From the trained ${metrics.selected_model}` : ''}>
            {metrics ? (
              <ul className="space-y-2.5">
                {metrics.feature_importance.slice(0, 8).map((f) => (
                  <li key={f.feature}>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="font-semibold text-ink">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                      <span className="tnum text-ink-faint">{Math.round(f.weight * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-sink">
                      <div className="h-full rounded-full bg-brass" style={{ width: `${Math.min(100, f.weight * 320)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Skeleton />}
          </Panel>
        </div>

        <Panel title="Audit log" sub="Every decision recorded, newest first" className="mt-4">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, recipients, actors…" aria-label="Search audit log"
            className="mb-3 h-10 w-full max-w-md rounded-xl border border-ink/12 px-3.5 text-[13px] outline-none focus:border-brass" />
          <div className="max-h-[420px] overflow-auto rounded-xl border border-ink/8">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-paper-sink text-[11px] font-bold text-ink-mute">
                <tr>
                  <th className="px-3 py-2">Time</th><th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Event</th><th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((r, i) => (
                  <tr key={i} className="border-t border-ink/6">
                    <td className="tnum whitespace-nowrap px-3 py-2 text-ink-faint">{dayOf(r.at)} {stamp(r.at)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-paper-sink px-2 py-0.5 text-[10px] font-bold text-ink-mute">
                        {r.actor}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink">
                      {r.event}
                      {r.detail && <span className="block text-[11px] text-ink-faint">{r.detail}</span>}
                    </td>
                    <td className="px-3 py-2 text-ink-mute">{r.who}</td>
                    <td className="tnum px-3 py-2 text-right font-semibold text-ink">{inr(r.amount)}</td>
                  </tr>
                ))}
                {auditRows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-faint">No events match that search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="h-10" />
      </main>
    </div>
  );
}

function Panel({ title, sub, children, className = '' }: {
  title: string; sub?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl2 bg-paper-card p-5 shadow-lift ${className}`}>
      <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
      {sub && <p className="mb-4 mt-0.5 text-[12px] text-ink-faint">{sub}</p>}
      {children}
    </section>
  );
}
function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl2 bg-paper-card p-4 shadow-lift">
      <p className={`tnum text-[22px] font-extrabold ${tone ?? 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-ink-faint">{label}</p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper-sink py-2.5">
      <dd className="tnum text-[16px] font-extrabold text-ink">{value}</dd>
      <dt className="text-[10px] font-semibold text-ink-faint">{label}</dt>
    </div>
  );
}
function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div>
      <p className={`tnum text-[18px] font-extrabold ${tone ?? 'text-ink'}`}>{v}</p>
      <p className="text-[11px] text-ink-faint">{k}</p>
    </div>
  );
}
function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/6 pb-2">
      <dt className="text-[12px] text-ink-mute">{k}</dt>
      <dd className={`tnum text-[14px] font-extrabold ${tone ?? 'text-ink'}`}>{v}</dd>
    </div>
  );
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`rounded-lg px-3 py-3 text-center ${className}`}>{children}</td>;
}
function Skeleton() {
  return <div className="rounded-xl bg-paper-sink p-6 text-center text-[12px] text-ink-faint">
    Run <code className="font-bold">python3 ml/train.py</code> to generate model metrics.
  </div>;
}
