import { NextResponse } from 'next/server';
import { assessRisk } from '@/lib/risk-engine';
import { evaluatePolicy } from '@/lib/policy-engine';
import { executePayment } from '@/lib/payment-adapter';
import { redeemApproval } from '@/lib/approval-registry';
import { decisionText } from '@/lib/labels';
import { HARD_LIMIT_INR } from '@/lib/constants';
import type { AuditEvent } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * The single authorisation path. Every rail (UPI, QR, bank, recharge, bills)
 * comes through here. The pipeline is fixed and ordered:
 *
 *   validate -> risk engine -> policy engine -> guardian check -> adapter
 *
 * Client-supplied risk scores are ignored. The server recomputes everything.
 */
export async function POST(req: Request) {
  const now = () => new Date().toISOString();
  const audit: AuditEvent[] = [];
  const log = (event: string, actor: AuditEvent['actor'], detail?: string) =>
    audit.push({ at: now(), event, actor, detail });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const amount = Number(body.amount);
  const txnId: string = body.txnId ?? `t_${Date.now()}`;
  log('Payment initiated', 'user', `${body.rail ?? 'upi'} · ₹${amount}`);

  // ---- Step 1: validation. Hard limit first, before any scoring.
  if (!Number.isFinite(amount) || amount <= 0) {
    log('Rejected: invalid amount', 'system');
    return NextResponse.json({ ok: false, stage: 'validation', reason: 'Enter a valid amount.', audit }, { status: 400 });
  }
  if (amount > HARD_LIMIT_INR) {
    log(`Rejected: exceeds hard limit of ₹${HARD_LIMIT_INR}`, 'system');
    return NextResponse.json({
      ok: false, stage: 'limit', limitBreached: true,
      reason: `TrustPay allows a maximum of ₹${HARD_LIMIT_INR.toLocaleString('en-IN')} per recipient per transaction.`,
      audit,
    }, { status: 422 });
  }

  if (body.recipient?.name) log('Recipient identified', 'system', body.recipient.name);

  // ---- Step 2: risk engine (server-side, always recomputed)
  const risk = assessRisk({
    amount, note: body.note, recipient: body.recipient ?? null,
    userAveragePayment: Number(body.userAveragePayment) || 2400,
    recentTransactions: body.recentTransactions ?? [],
    travelMode: !!body.travelMode,
    purposeId: body.purposeId,
  });
  log(`Risk engine executed — score ${risk.score} (${risk.level})`, 'risk_engine',
    risk.factors.slice(0, 3).map((f) => f.label).join('; '));

  // ---- Step 3: policy engine
  const policy = evaluatePolicy({
    userLimit: Number(body.userLimit) || undefined,
    amount, risk, recipient: body.recipient ?? null,
    mode: body.mode ?? 'balanced', travelMode: !!body.travelMode,
    travelGuardianId: body.travelGuardianId, guardians: body.guardians ?? [],
  });
  log(`Policy decision: ${decisionText(policy.decision)}`, 'policy_engine', policy.reasons.join(' '));

  if (policy.decision === 'block') {
    log('Payment stopped before authorisation', 'system');
    return NextResponse.json({ ok: false, stage: 'policy', risk, policy, reason: policy.reasons[0], audit }, { status: 422 });
  }

  // ---- Step 4: Guardian approval must be proven, not claimed
  if (policy.decision === 'guardian_required') {
    const redeemed = redeemApproval(body.approvalToken, txnId, amount);
    if (!redeemed.ok) {
      log('Guardian approval required', 'policy_engine', redeemed.reason);
      return NextResponse.json({
        ok: false, stage: 'guardian', risk, policy,
        requiresGuardian: true, requiredGuardianId: policy.requiredGuardianId,
        reason: redeemed.reason, audit,
      }, { status: 428 });
    }
    log('Guardian approval verified', 'system', `Token redeemed for ${redeemed.guardianId}`);
  }

  // ---- Step 5: adapter (mock, or Razorpay test mode when configured)
  const result = await executePayment({
    amount, rail: body.rail ?? 'upi', note: body.note,
    recipientHandle: body.recipient?.upiId ?? body.recipientHandle ?? '',
    recipientName: body.recipient?.name ?? body.recipientName ?? '',
    forceFailure: !!body.forceFailure,
  });

  if (!result.ok) {
    log(`Payment failed at gateway: ${result.code}`, 'adapter', result.reason);
    log('No money was moved', 'system');
    return NextResponse.json({ ok: false, stage: 'gateway', risk, policy, reason: result.reason, retryable: result.retryable, audit }, { status: 502 });
  }

  log(`Payment completed (${result.mode})`, 'adapter', result.reference);
  return NextResponse.json({ ok: true, risk, policy, reference: result.reference, mode: result.mode, audit });
}
