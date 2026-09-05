import { HARD_LIMIT_INR, PROTECTION_PROFILES, type ProtectionMode } from './constants';
import type { GuardianContact, PolicyResult, Recipient, RiskAssessment } from './types';

export interface PolicyInput {
  amount: number;
  risk: RiskAssessment;
  recipient?: Recipient | null;
  mode: ProtectionMode;
  travelMode: boolean;
  travelGuardianId?: string;
  guardians: GuardianContact[];
  /** A user-chosen ceiling. Only ever tightens; see effectiveLimit below. */
  userLimit?: number;
}

/**
 * The policy engine is the only component allowed to authorise a payment.
 * The risk engine advises it; the LLM never calls it. Order matters: the hard
 * limit is checked before anything else, so no downstream signal can unblock it.
 */
export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const { amount, risk, recipient, mode, travelMode, guardians } = input;
  const reasons: string[] = [];

  // ---- 1. Hard ceiling. Non-negotiable, checked first, no override path.
  if (!Number.isFinite(amount) || amount <= 0) {
    return { decision: 'block', reasons: ['Enter a valid amount.'], limitBreached: false };
  }
  // A user may lower their own ceiling but never raise it. Math.min is the whole
  // guarantee: a corrupted store, a tampered request or a future settings bug
  // can only ever make this stricter, never weaker than the hard limit.
  const effectiveLimit = Math.min(
    HARD_LIMIT_INR,
    Number.isFinite(input.userLimit as number) && (input.userLimit as number) > 0
      ? (input.userLimit as number)
      : HARD_LIMIT_INR,
  );
  if (amount > effectiveLimit) {
    const self = effectiveLimit < HARD_LIMIT_INR;
    return {
      decision: 'block',
      reasons: [self
        ? `Your payment limit is ₹${effectiveLimit.toLocaleString('en-IN')}. Change it in Profile → Payment limit.`
        : `TrustPay allows a maximum of ₹${HARD_LIMIT_INR.toLocaleString('en-IN')} per recipient per transaction.`],
      limitBreached: true,
    };
  }

  const p = PROTECTION_PROFILES[mode];
  // Travel Mode tightens every threshold. It cannot loosen any of them.
  const verifyAt = travelMode ? Math.max(0, p.verifyAt - 10) : p.verifyAt;
  const guardianAt = travelMode ? Math.max(0, p.guardianAt - 15) : p.guardianAt;
  const guardianAmount = travelMode ? Math.round(p.guardianAmount * 0.6) : p.guardianAmount;
  const blockAt = p.blockAt;

  // ---- 2. Blocking conditions
  if (risk.score >= blockAt) {
    reasons.push(`Risk score ${risk.score} is above the blocking threshold of ${blockAt}.`);
    return { decision: 'block', reasons, limitBreached: false };
  }
  if (recipient && recipient.reportCount >= 3 && risk.level === 'high') {
    reasons.push(`This recipient has ${recipient.reportCount} reports and this payment scores as high risk.`);
    return { decision: 'block', reasons, limitBreached: false };
  }

  // ---- 3. Guardian approval conditions
  const isNew = !recipient || recipient.paymentsFromUser === 0;
  const needGuardian: string[] = [];
  if (risk.score >= guardianAt) needGuardian.push(`Risk score ${risk.score} needs a second opinion.`);
  if (amount > guardianAmount) needGuardian.push(`Payments above ₹${guardianAmount.toLocaleString('en-IN')} need approval in ${p.label} mode.`);
  if (travelMode && risk.level !== 'low') needGuardian.push('Travel Protection is on and this payment is not low risk.');
  if (mode === 'maximum' && isNew) needGuardian.push('Maximum protection asks for approval on every new recipient.');

  if (needGuardian.length) {
    const guardian = pickGuardian(input, isNew, risk);
    return {
      decision: 'guardian_required',
      reasons: needGuardian,
      limitBreached: false,
      requiredGuardianId: guardian?.id,
    };
  }

  // ---- 4. Verification friction
  if (risk.score >= verifyAt) {
    reasons.push(`Risk score ${risk.score} is above your ${p.label.toLowerCase()} threshold of ${verifyAt}.`);
    return { decision: 'verify', reasons, limitBreached: false };
  }
  if (p.newRecipientVerify && isNew) {
    reasons.push('Maximum protection verifies every new recipient.');
    return { decision: 'verify', reasons, limitBreached: false };
  }

  return { decision: 'allow', reasons: ['Nothing unusual found.'], limitBreached: false };
}

function pickGuardian(input: PolicyInput, isNew: boolean, risk: RiskAssessment) {
  const { guardians, travelMode, travelGuardianId, amount } = input;
  if (travelMode && travelGuardianId) {
    const t = guardians.find((g) => g.id === travelGuardianId);
    if (t) return t;
  }
  return (
    guardians.find((g) => risk.level === 'high' && g.approvesHighRisk) ??
    guardians.find((g) => isNew && g.approvesNewRecipients) ??
    guardians.find((g) => g.approvesAboveAmount != null && amount > g.approvesAboveAmount) ??
    guardians[0]
  );
}

/** Shared guard used by every entry point: UI, API, chatbot action layer. */
export function exceedsHardLimit(amount: number) {
  return !Number.isFinite(amount) || amount > HARD_LIMIT_INR;
}
