/** Guardian's hard payment ceiling. Enforced in validation before any other
 *  logic runs, on both client and server. No feature -- Guardian Circle,
 *  Travel Mode, the chatbot, or the risk engine -- can raise or bypass it. */
/**
 * Absolute system maximum for a single payment. A user may set their own limit
 * anywhere at or below this; they cannot exceed it. The backstop stays so that
 * a tampered request, a corrupted store or a bug in the settings screen still
 * cannot authorise an unbounded transfer.
 */
export const HARD_LIMIT_INR = 100_000;

/** What a new user starts on. Deliberately conservative; they can raise it. */
export const DEFAULT_LIMIT_INR = 20_000;

export const RISK_BANDS = {
  low: { min: 0, max: 30 },
  medium: { min: 31, max: 70 },
  high: { min: 71, max: 100 },
} as const;

export type ProtectionMode = 'convenience' | 'balanced' | 'maximum';

/** Protection preference changes when Guardian intervenes -- never the ceiling. */
export const PROTECTION_PROFILES: Record<ProtectionMode, {
  label: string; blurb: string;
  verifyAt: number; guardianAt: number; blockAt: number;
  guardianAmount: number; newRecipientVerify: boolean;
}> = {
  convenience: {
    label: 'Convenience',
    blurb: 'Only very high-risk payments are interrupted.',
    verifyAt: 45, guardianAt: 71, blockAt: 96,
    guardianAmount: 15_000, newRecipientVerify: false,
  },
  balanced: {
    label: 'Balanced',
    blurb: 'Medium and high-risk payments need a Guardian before they go out.',
    // 31 is the top of the low band, so anything medium or higher goes to a
    // Guardian rather than being waved through with a self-confirm prompt.
    verifyAt: 20, guardianAt: 31, blockAt: 92,
    guardianAmount: 10_000, newRecipientVerify: false,
  },
  maximum: {
    label: 'Maximum protection',
    blurb: 'New recipients and unusual payments always need a second look.',
    verifyAt: 15, guardianAt: 31, blockAt: 88,
    guardianAmount: 5_000, newRecipientVerify: true,
  },
};

export const DEMO_DISCLAIMER =
  'Prototype. Test data and simulated payments only — no real money moves.';

/** How long an authorised payment stays valid before the gateway drops it. */
export const GATEWAY_WINDOW_S = 120;
