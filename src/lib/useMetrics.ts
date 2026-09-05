'use client';
import { useEffect, useState } from 'react';

export interface SweepRow {
  threshold: number; precision: number; recall: number;
  false_positives: number; false_negatives: number;
  true_positives: number; true_negatives: number;
  false_positive_rate: number; friction_cost: number;
  fraud_loss: number; total_cost: number; amount_protected: number;
}
export interface Metrics {
  generated_at: string; disclaimer: string;
  dataset: { total_rows: number; fraud_rows: number; fraud_rate: number;
    train_rows: number; test_rows: number; split: string; features: string[] };
  models: Record<string, any>;
  selected_model: string; selection_criterion: string; default_threshold: number;
  cost_model: Record<string, any>;
  threshold_sweep: SweepRow[];
  feature_importance: { feature: string; weight: number }[];
}

/** Loads the metrics produced by `python3 ml/train.py`. Nothing here is
 *  hard-coded: if the model is retrained, these numbers change. */
export function useMetrics() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch('/ml/metrics.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setM).catch(() => setErr(true));
  }, []);
  return { metrics: m, error: err };
}

export const FEATURE_LABELS: Record<string, string> = {
  amount: 'Payment amount', hour: 'Hour of day', is_new_recipient: 'First-time recipient',
  recipient_age_days: 'Recipient account age', recipient_txn_count: 'Recipient payment volume',
  recipient_report_count: 'Reports against recipient', user_avg_payment: 'Your typical payment',
  amount_deviation: 'Deviation from your normal', txn_velocity_1h: 'Payments in the last hour',
  urgency_score: 'Urgency language', secrecy_score: 'Secrecy language',
  historical_relationship: 'Your history with them', is_odd_hour: 'Unusual hour',
};
