import type { TxnStatus } from './types';

export const STATUS_LABEL: Record<TxnStatus, string> = {
  successful: 'Successful',
  protected: 'Stopped by Guardian',
  flagged: 'Reported',
  blocked: 'Blocked',
  failed: 'Failed',
  pending_guardian: 'Waiting for Guardian',
  recovery: 'In recovery',
  refunded: 'Refunded to you',
};

/** Audit entries are read by people, not machines. `guardian_required` is an
 *  internal enum value and should never reach a user's screen. */
export const DECISION_LABEL: Record<string, string> = {
  allow: 'allowed',
  verify: 'verification asked for',
  guardian_required: 'Guardian approval required',
  block: 'blocked',
};

export const decisionText = (d?: string) => DECISION_LABEL[d ?? ''] ?? d ?? 'reviewed';
