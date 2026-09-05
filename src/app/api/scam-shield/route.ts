import { NextResponse } from 'next/server';
import { analyseMessage } from '@/lib/scam-shield';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { message } = await req.json().catch(() => ({ message: '' }));
  if (typeof message !== 'string')
    return NextResponse.json({ error: 'Send a message string.' }, { status: 400 });
  return NextResponse.json(analyseMessage(message.slice(0, 4000)));
}
