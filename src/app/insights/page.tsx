'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { useMetrics, FEATURE_LABELS } from '@/lib/useMetrics';
import { Card, DemoNote, Empty, TopBar } from '@/components/ui';
import { inr } from '@/lib/format';

export default function InsightsPage() {
  const router = useRouter();
  const { metrics, error } = useMetrics();
  const [t, setT] = useState<number | null>(null);

  const threshold = t ?? metrics?.default_threshold ?? 50;
  const row = useMemo(
    () => metrics?.threshold_sweep.find((s) => s.threshold === threshold),
    [metrics, threshold]);

  const chartData = useMemo(() => metrics?.threshold_sweep
    .filter((s) => s.threshold % 2 === 0)
    .map((s) => ({
      threshold: s.threshold,
      Precision: Math.round(s.precision * 100),
      Recall: Math.round(s.recall * 100),
      'False positive rate': Math.round(s.false_positive_rate * 100),
      Cost: Math.round(s.total_cost),
    })) ?? [], [metrics]);

  if (error) return (
    <div>
      <TopBar title="How Guardian decides" onBack={() => router.back()} />
      <div className="px-5 pt-4">
        <Empty title="Model metrics not built yet"
          body="Run python3 ml/train.py to generate the dataset, train the model and write public/ml/metrics.json. Nothing on this screen is hard-coded, so it stays empty until the model has actually been trained." />
      </div>
    </div>
  );

  if (!metrics || !row) return <div className="h-screen" />;
  const best = metrics.models[metrics.selected_model];

  return (
    <div className="animate-fade">
      <TopBar title="How Guardian decides" onBack={() => router.back()} />

      <div className="px-5 pt-2">
        <p className="text-[14px] leading-relaxed text-ink-mute">
          Guardian&apos;s rules are explainable by design. A model sits alongside them, trained on a
          synthetic dataset and measured on data it never saw.
        </p>

        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-extrabold text-ink">{metrics.selected_model}</h2>
          <p className="mt-1 text-[12px] text-ink-faint">
            Chosen by {metrics.selection_criterion}. Compared against{' '}
            {Object.keys(metrics.models).filter((k) => k !== metrics.selected_model).join(' and ')}.
          </p>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Metric label="Precision" value={pct(best.precision)} />
            <Metric label="Recall" value={pct(best.recall)} />
            <Metric label="F1" value={best.f1.toFixed(2)} />
            <Metric label="AUC" value={best.roc_auc.toFixed(2)} />
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Cell label="Caught fraud" value={best.confusion_matrix.tp} tone="text-calm" />
            <Cell label="Missed fraud" value={best.confusion_matrix.fn} tone="text-alert" />
            <Cell label="False alarms" value={best.confusion_matrix.fp} tone="text-watch" />
            <Cell label="Correctly cleared" value={best.confusion_matrix.tn} />
          </div>
          <DemoNote>
            {metrics.dataset.total_rows} synthetic transactions, {pct(metrics.dataset.fraud_rate)} fraud.
            {' '}{metrics.dataset.train_rows} for training, {metrics.dataset.test_rows} held out.
            These figures describe behaviour on generated data and do not represent real-world fraud performance.
          </DemoNote>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-extrabold text-ink">Risk threshold simulator</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">
            Drag to change where Guardian draws the line. Every number below is recomputed from the
            held-out test set.
          </p>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="tnum text-[34px] font-extrabold text-ink">{threshold}</span>
            <span className="text-[13px] font-semibold text-ink-mute">flag at or above this score</span>
          </div>
          <input type="range" min={0} max={100} value={threshold}
            onChange={(e) => setT(Number(e.target.value))}
            aria-label="Risk threshold"
            className="mt-3 w-full accent-[#A8763A]" />
          <div className="flex justify-between text-[11px] font-semibold text-ink-faint">
            <span>Catch more fraud</span><span>Interrupt fewer people</span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2">
            <Big label="Precision" value={pct(row.precision)}
              note="of flagged payments were actually fraud" />
            <Big label="Recall" value={pct(row.recall)}
              note="of all fraud was caught" />
            <Big label="False alarms" value={String(row.false_positives)}
              note="good payments interrupted" tone="text-watch" />
            <Big label="Missed fraud" value={String(row.false_negatives)}
              note="fraudulent payments allowed" tone="text-alert" />
          </dl>

          <div className="mt-3 rounded-xl bg-paper-sink p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-ink-mute">Estimated cost</span>
              <span className="tnum text-[17px] font-extrabold text-ink">{inr(row.total_cost)}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
              {inr(row.friction_cost)} of friction from {row.false_positives} interruptions, plus{' '}
              {inr(row.fraud_loss)} lost to {row.false_negatives} missed fraudulent payments.
            </p>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-mute">
            {threshold < 25
              ? 'A low threshold catches nearly everything, but most of what it flags is legitimate. Users stop reading warnings that are usually wrong.'
              : threshold > 75
                ? 'A high threshold almost never interrupts anyone, and quietly lets most fraud through.'
                : 'This range trades a manageable number of interruptions for most of the fraud caught.'}
          </p>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-extrabold text-ink">The trade-off, drawn</h2>
          <div className="mt-3 h-[220px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 6, bottom: 4, left: -22 }}>
                <CartesianGrid stroke="#12212F" strokeOpacity={0.07} vertical={false} />
                <XAxis dataKey="threshold" tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid rgba(18,33,47,.1)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={threshold} stroke="#A8763A" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Precision" stroke="#17795C" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Recall" stroke="#B23A2F" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="False positive rate" stroke="#D2830E" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="mt-4 text-[13px] font-extrabold text-ink">Estimated cost by threshold</h3>
          <div className="mt-2 h-[180px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 6, bottom: 4, left: -6 }}>
                <CartesianGrid stroke="#12212F" strokeOpacity={0.07} vertical={false} />
                <XAxis dataKey="threshold" tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#7A8CA0' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: any) => inr(Number(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid rgba(18,33,47,.1)' }} />
                <ReferenceLine x={threshold} stroke="#A8763A" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Cost" stroke="#12212F" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-extrabold text-ink">Why we don&apos;t just minimise cost</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">
            {metrics.cost_model.why_not_cost_optimal}
          </p>
          <dl className="mt-3 space-y-1.5 text-[12px]">
            <Line2 k="Cheapest threshold on paper"
              v={`${metrics.cost_model.cost_optimal_threshold} — precision ${pct(metrics.cost_model.cost_optimal_precision)}`} />
            <Line2 k="What Guardian actually uses"
              v={`${metrics.cost_model.operating_threshold} — precision ${pct(metrics.cost_model.operating_precision)}, recall ${pct(metrics.cost_model.operating_recall)}`} />
            <Line2 k="Constraint" v={metrics.cost_model.operating_constraint} />
            <Line2 k="Cost of one false alarm" v={inr(metrics.cost_model.false_positive_cost_inr)} />
          </dl>
          <DemoNote>{metrics.cost_model.false_positive_basis}</DemoNote>
        </Card>

        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-extrabold text-ink">What the model weighs most</h2>
          <ul className="mt-3 space-y-2">
            {metrics.feature_importance.slice(0, 7).map((f) => (
              <li key={f.feature}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold text-ink">
                    {FEATURE_LABELS[f.feature] ?? f.feature}
                  </span>
                  <span className="tnum text-[11px] font-bold text-ink-faint">{pct(f.weight)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-sink">
                  <div className="h-full rounded-full bg-brass"
                    style={{ width: `${Math.min(100, f.weight * 320)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <DemoNote>{metrics.disclaimer}</DemoNote>
      </div>
      <div className="h-8" />
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper-sink py-2.5">
      <dd className="tnum text-[15px] font-extrabold text-ink">{value}</dd>
      <dt className="mt-0.5 text-[10px] font-semibold text-ink-faint">{label}</dt>
    </div>
  );
}
function Cell({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-paper-sink px-3 py-2">
      <span className="text-[11px] font-semibold text-ink-mute">{label}</span>
      <span className={`tnum text-[14px] font-extrabold ${tone ?? 'text-ink'}`}>{value}</span>
    </div>
  );
}
function Big({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-paper-sink p-3">
      <dd className={`tnum text-[20px] font-extrabold ${tone ?? 'text-ink'}`}>{value}</dd>
      <dt className="text-[11px] font-bold text-ink">{label}</dt>
      <p className="mt-0.5 text-[10px] leading-tight text-ink-faint">{note}</p>
    </div>
  );
}
function Line2({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-ink-mute">{k}:</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}
