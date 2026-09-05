import type { FraudReport, RecoveryCase, Transaction } from './types';

const RECOVERY_WINDOW_HOURS = 72;
const CONFIDENCE_THRESHOLD = 70;

/** Transparent, inspectable eligibility rules. Nothing here reverses a real
 *  payment -- UPI transfers are not generally reversible once settled. This
 *  models the dispute workflow a PSP would run, with simulated outcomes. */
export function assessRecovery(txn: Transaction, report: FraudReport, recipientReports: number) {
  const ageHours = (Date.now() - new Date(txn.createdAt).getTime()) / 3_600_000;
  const checks = [
    { ok: ageHours <= RECOVERY_WINDOW_HOURS,
      text: `Reported ${Math.round(ageHours)}h after payment (simulated ${RECOVERY_WINDOW_HOURS}h window)` },
    { ok: report.confidence >= CONFIDENCE_THRESHOLD,
      text: `Fraud confidence ${report.confidence}% (threshold ${CONFIDENCE_THRESHOLD}%)` },
    { ok: recipientReports >= 2,
      text: `Recipient carries ${recipientReports} report(s) in demo data` },
    { ok: !!report.description && report.description.trim().length >= 15,
      text: 'Description provides enough detail to act on' },
    { ok: txn.status !== 'recovery' && !txn.recoveryCaseId,
      text: 'No recovery case already open for this payment' },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const eligibility: RecoveryCase['eligibility'] =
    passed >= 4 ? 'high' : passed === 3 ? 'medium' : passed === 2 ? 'low' : 'ineligible';
  return { eligibility, checks };
}

/** Simulated outcome. Deterministic on the case id so a demo replays identically. */
export function simulateRecoveryOutcome(caseId: string, eligibility: RecoveryCase['eligibility']) {
  const seed = caseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const roll = seed % 100;
  if (eligibility === 'high') return roll < 75 ? 'recovered' : 'manual_review';
  if (eligibility === 'medium') return roll < 40 ? 'recovered' : 'manual_review';
  return 'manual_review';
}

export const RECOVERY_STOP_RULES = [
  'Funds recovered in simulation',
  'Case resolved by manual review',
  'Maximum of 2 automatic attempts reached',
  'User withdrew the request',
];
