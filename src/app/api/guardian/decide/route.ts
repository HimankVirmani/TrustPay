import { NextResponse } from 'next/server';
import { issueApproval } from '@/lib/approval-registry';
import { HARD_LIMIT_INR } from '@/lib/constants';

export const runtime = 'nodejs';

/** A Guardian approving does NOT execute the payment. It only mints a
 *  single-use token that the payment pipeline will later verify. Approval also
 *  cannot lift the hard limit. */
export async function POST(req: Request) {
  const { txnId, amount, guardianId, outcome } = await req.json().catch(() => ({} as any));

  if (!txnId || !guardianId || !['approved', 'rejected'].includes(outcome))
    return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 });

  if (outcome === 'rejected')
    return NextResponse.json({ ok: true, outcome: 'rejected', token: null });

  if (!Number.isFinite(Number(amount)) || Number(amount) > HARD_LIMIT_INR)
    return NextResponse.json({
      ok: false,
      error: `A Guardian cannot approve more than ₹${HARD_LIMIT_INR.toLocaleString('en-IN')}.`,
    }, { status: 422 });

  return NextResponse.json({
    ok: true, outcome: 'approved',
    token: issueApproval(txnId, Number(amount), guardianId),
  });
}
