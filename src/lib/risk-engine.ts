import type { Recipient, RiskAssessment, RiskFactor, RiskLevel, Transaction } from './types';
import { analyseMessage } from './scam-shield';
import { purposeById } from './accounts';

export interface RiskInput {
  amount: number;
  note?: string;
  recipient?: Recipient | null;
  userAveragePayment: number;
  recentTransactions: Transaction[];
  now?: Date;
  travelMode?: boolean;
  purposeId?: string;
}

const band = (score: number): RiskLevel =>
  score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high';

/**
 * Multi-signal additive scorer with an explicit trust dampener.
 *
 * Design note: a naive scorer flags every large payment, which trains users to
 * dismiss warnings. Guardian scores risk factors and then *subtracts* earned
 * trust, so a big rent payment to a recipient you have paid for two years does
 * not look like fraud. Every point that moves the score carries a reason.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const { amount, note, recipient, userAveragePayment, recentTransactions } = input;
  const now = input.now ?? new Date();
  const factors: RiskFactor[] = [];
  const add = (code: string, label: string, points: number, detail: string) => {
    if (points !== 0) factors.push({ code, label, points, detail });
  };

  // ---------- Recipient identity signals
  if (!recipient || recipient.paymentsFromUser === 0) {
    add('new_recipient', 'First payment to this recipient', 20,
      'You have never paid this account before.');
  } else if (recipient.paymentsFromUser >= 8) {
    add('established', 'Established recipient', -18,
      `You have paid this recipient ${recipient.paymentsFromUser} times before.`);
  } else if (recipient.paymentsFromUser >= 3) {
    add('familiar', 'Familiar recipient', -10,
      `You have paid this recipient ${recipient.paymentsFromUser} times before.`);
  }

  if (recipient) {
    if (recipient.reportCount >= 3) {
      add('reported_heavy', 'Recipient has multiple reports', 30,
        `${recipient.reportCount} reports filed against this account in demo data.`);
    } else if (recipient.reportCount > 0) {
      add('reported', 'Recipient has been reported', 18,
        `${recipient.reportCount} ${recipient.reportCount === 1 ? 'report' : 'reports'} filed against this account in demo data.`);
    }

    if (recipient.accountAgeDays < 30) {
      add('young_account', 'Recently created account', 14,
        `This account is ${recipient.accountAgeDays} days old.`);
    } else if (recipient.accountAgeDays > 540) {
      add('aged_account', 'Long-standing account', -6,
        `This account has existed for ${Math.round(recipient.accountAgeDays / 365)}+ years.`);
    }

    if (recipient.trustScore >= 80) {
      add('high_trust', 'Strong trust history', -12,
        `Trust score ${recipient.trustScore}/100 from synthetic reputation data.`);
    } else if (recipient.trustScore < 35) {
      add('low_trust', 'Weak trust signals', 16,
        `Trust score ${recipient.trustScore}/100 from synthetic reputation data.`);
    }

    if (recipient.recentSuspiciousActivity) {
      add('recent_suspicious', 'Recent suspicious activity', 15,
        'This account shows an unusual pattern of incoming payments in demo data.');
    }
    if (recipient.successfulTxns > 200) {
      add('volume', 'High completed transaction volume', -5,
        `${recipient.successfulTxns} completed payments in demo data.`);
    }
  }

  // ---------- Amount signals
  const avg = Math.max(userAveragePayment, 200);
  const deviation = amount / avg;
  if (deviation >= 5) {
    add('amount_extreme', 'Much larger than your usual payment', 18,
      `This is ${deviation.toFixed(1)}x your typical ₹${Math.round(avg).toLocaleString('en-IN')} payment.`);
  } else if (deviation >= 2.5) {
    add('amount_high', 'Larger than your usual payment', 10,
      `This is ${deviation.toFixed(1)}x your typical payment.`);
  }
  if (amount >= 15_000) {
    add('near_limit', 'Close to your safety limit', 8,
      'Large transfers are the most common target for payment scams.');
  }

  // ---------- Behavioural signals
  const hour = now.getHours();
  if (hour < 6 || hour >= 23) {
    add('odd_hour', 'Unusual time of day', 7,
      `Payments at ${hour}:00 are outside your normal activity.`);
  }

  const hourAgo = now.getTime() - 3600_000;
  const velocity = recentTransactions.filter(
    (t) => new Date(t.createdAt).getTime() > hourAgo).length;
  if (velocity >= 4) {
    add('velocity', 'Several payments in a short window', 12,
      `${velocity} payments in the last hour.`);
  } else if (velocity === 3) {
    add('velocity_mild', 'Faster than usual payment activity', 6,
      '3 payments in the last hour.');
  }

  const paidThisRecipientToday = recentTransactions.filter(
    (t) => t.recipientId && recipient && t.recipientId === recipient.id &&
      now.getTime() - new Date(t.createdAt).getTime() < 86_400_000).length;
  if (paidThisRecipientToday >= 2 && (!recipient || recipient.paymentsFromUser < 3)) {
    add('repeat_pressure', 'Repeated payments to a new recipient', 11,
      'Escalating requests are a common scam pattern.');
  }

  // ---------- Message signals (Scam Shield feeds the risk engine)
  // ---------- Stated purpose
  // The purpose the user picked is evidence too. Advance-fee fraud in India
  // almost always arrives wearing one of a small set of cover stories, so a
  // self-declared "job registration" or "prize claim" is a real signal, not a
  // form field. Weighted below the hard recipient signals: honest people do
  // pay genuine registration fees, so this escalates rather than blocks.
  const purpose = purposeById(input.purposeId);
  if (purpose?.riskySignal) {
    add('purpose_risky', `Purpose: ${purpose.label}`, 22, purpose.riskySignal);
  }

  if (note && note.trim()) {
    const scam = analyseMessage(note);
    if (scam.score >= 60) {
      add('scam_high', 'Message shows manipulation patterns', 22, scam.verdict);
    } else if (scam.score >= 30) {
      add('scam_medium', 'Message contains pressure language', 12, scam.verdict);
    } else if (scam.score > 0) {
      add('scam_low', 'Minor pressure language in message', 5, scam.verdict);
    }
  }

  // ---------- Travel mode raises sensitivity, never the ceiling
  if (input.travelMode && (!recipient || recipient.paymentsFromUser === 0)) {
    add('travel_new', 'New recipient while travelling', 9,
      'Travel Protection applies stricter checks to unfamiliar accounts.');
  }

  const positives = factors.filter((f) => f.points > 0).reduce((s, f) => s + f.points, 0);
  const rawCredits = factors.filter((f) => f.points < 0).reduce((s, f) => s + f.points, 0);

  // Trust discounts risk; it does not delete it. Credits are capped at 70% of
  // the positive signal so a large, unusual payment to a well-known recipient
  // still reads as "we noticed, and it's fine" rather than a silent zero.
  // Without this cap an 18,000 rent payment scored 0, which hides the fact that
  // the engine saw the amount at all.
  const credits = Math.max(rawCredits, -0.7 * positives);

  // Reported recipients and confirmed scam language cannot be discounted below
  // a hard floor no matter how much history exists.
  const floor = factors.some((f) => ['reported_heavy', 'scam_high'].includes(f.code)) ? 55 : 0;
  const score = Math.max(floor, Math.min(100, Math.round(positives + credits)));
  const level = band(score);

  const top = [...factors].filter(f => f.points > 0).sort((a, b) => b.points - a.points)[0];

  const summary =
    level === 'low'
      ? factors.some((f) => f.points < 0)
        ? 'This looks like a normal payment for you.'
        : 'Nothing unusual about this payment.'
      : level === 'medium'
        ? `Worth a second look${top ? `: ${top.label.toLowerCase()}` : ''}.`
        : `Several warning signs${top ? `, starting with ${top.label.toLowerCase()}` : ''}.`;

  const recommendation =
    level === 'low' ? 'Go ahead.'
      : level === 'medium' ? 'Confirm you know who you are paying before you continue.'
        : 'Call the recipient on a number you already have before sending anything.';

  return { score, level, factors: factors.sort((a, b) => b.points - a.points), summary, recommendation };
}
