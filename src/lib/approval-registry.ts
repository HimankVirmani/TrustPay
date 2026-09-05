import crypto from 'crypto';

/**
 * Server-held record of Guardian approvals.
 *
 * The client cannot simply assert "a Guardian approved this". It must present a
 * token that only this module issues, after a Guardian decision came through the
 * server. Tokens are single-use and bound to the transaction id and amount, so a
 * token issued for a 5,000 approval cannot authorise a 19,000 payment.
 *
 * In-memory for the prototype; this is the piece that would move to Postgres
 * (or Redis) first in a real deployment.
 */
type Grant = { txnId: string; amount: number; guardianId: string; issuedAt: number; used: boolean };
const grants = new Map<string, Grant>();
const TTL_MS = 15 * 60 * 1000;

export function issueApproval(txnId: string, amount: number, guardianId: string) {
  const token = crypto.randomBytes(24).toString('hex');
  grants.set(token, { txnId, amount, guardianId, issuedAt: Date.now(), used: false });
  return token;
}

export function redeemApproval(token: string | undefined, txnId: string, amount: number) {
  if (!token) return { ok: false as const, reason: 'No Guardian approval was presented.' };
  const g = grants.get(token);
  if (!g) return { ok: false as const, reason: 'Approval token is not recognised.' };
  if (g.used) return { ok: false as const, reason: 'This approval has already been used.' };
  if (Date.now() - g.issuedAt > TTL_MS) return { ok: false as const, reason: 'Approval has expired.' };
  if (g.txnId !== txnId) return { ok: false as const, reason: 'Approval was issued for a different payment.' };
  if (Math.abs(g.amount - amount) > 0.5)
    return { ok: false as const, reason: 'Amount changed after approval was granted.' };
  g.used = true;
  return { ok: true as const, guardianId: g.guardianId };
}
