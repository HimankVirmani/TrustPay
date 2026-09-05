import { NextResponse } from 'next/server';
import { assessRisk } from '@/lib/risk-engine';
import { evaluatePolicy } from '@/lib/policy-engine';
import { analyseMessage } from '@/lib/scam-shield';
import { HARD_LIMIT_INR } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const amount = Number(body.amount);
  const risk = assessRisk({
    amount,
    note: body.note,
    recipient: body.recipient ?? null,
    userAveragePayment: Number(body.userAveragePayment) || 2400,
    recentTransactions: Array.isArray(body.recentTransactions) ? body.recentTransactions : [],
    travelMode: !!body.travelMode,
    purposeId: body.purposeId,
  });

  const policy = evaluatePolicy({
    userLimit: Number(body.userLimit) || undefined,
    amount,
    risk,
    recipient: body.recipient ?? null,
    mode: body.mode ?? 'balanced',
    travelMode: !!body.travelMode,
    travelGuardianId: body.travelGuardianId,
    guardians: body.guardians ?? [],
  });

  const scam = body.note?.trim() ? analyseMessage(body.note) : null;

  return NextResponse.json({ risk, policy, scam, hardLimit: HARD_LIMIT_INR });
}
