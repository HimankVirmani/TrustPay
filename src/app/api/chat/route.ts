import { NextResponse } from 'next/server';
import { HARD_LIMIT_INR } from '@/lib/constants';

export const runtime = 'nodejs';

/**
 * TrustBot.
 *
 * Security posture: this route can ONLY return text. It has no import of the
 * payment adapter, the policy engine or the approval registry, so there is no
 * code path from a model response to a financial action. The model cannot
 * authorise a payment, raise the hard limit or approve on a Guardian's behalf
 * even if a user tries to talk it into doing so -- the capability does not
 * exist at this layer. Prompt wording is a second line of defence, not the first.
 */

const SYSTEM = `You are TrustBot, the in-app assistant for Guardian, an Indian payment app with a safety layer.

You answer questions about the user's own payment activity using ONLY the JSON snapshot provided. Rules you must follow:
- Never invent transactions, recipients, amounts or reports. If the snapshot does not contain it, say you do not have that information.
- You cannot authorise, send, approve or cancel payments. If asked, explain that payments are authorised by the policy engine and Guardians, not by you.
- The ₹${HARD_LIMIT_INR} per-transaction limit is fixed. Never suggest a way around it, and never imply it can be raised.
- Never ask for a UPI PIN, OTP, password or card details, and tell the user Guardian will never ask for these.
- All figures are prototype/test data. Say so when quoting totals.
- Be brief and concrete. Two or three short sentences unless asked for detail. Amounts in ₹ with Indian digit grouping.`;

export async function POST(req: Request) {
  const { message, snapshot } = await req.json().catch(() => ({} as any));
  if (typeof message !== 'string' || !message.trim())
    return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: SYSTEM,
          messages: [{
            role: 'user',
            content: `Snapshot of my account (test data):\n${JSON.stringify(snapshot).slice(0, 12000)}\n\nMy question: ${message.slice(0, 800)}`,
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.content ?? [])
          .filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
        if (text) return NextResponse.json({ reply: text, source: 'llm' });
      }
    } catch { /* fall through to the deterministic answerer */ }
  }

  return NextResponse.json({ reply: answerLocally(message, snapshot), source: 'rules' });
}

/** Deterministic fallback so the demo never depends on a network call.
 *  Reads the same snapshot and answers from data only. */
function answerLocally(q: string, s: any): string {
  const m = q.toLowerCase().trim();
  const inr = (n: number) => `\u20b9${Number(n || 0).toLocaleString('en-IN')}`;
  const txns: any[] = s?.transactions ?? [];
  const recipients: any[] = s?.recipients ?? [];
  const limit = Number(s?.userLimit) || HARD_LIMIT_INR;
  const has = (...w: string[]) => w.some((x) => m.includes(x));

  // ---- Conversational openers, so the first message never hits the fallback.
  if (/^(hi|hey|hello|yo|hii+|namaste|hola)\b/.test(m) || m === 'hi')
    return `Hello. I'm TrustBot. I can explain any payment of yours \u2014 why it scored what it did, why a Guardian was asked, how much has been stopped, or whether a message you received looks like a scam. What would you like to know?`;

  if (has('who are you', 'what are you', 'your name'))
    return `I'm TrustBot, the assistant inside TrustPay. I can read your payments, risk scores and Guardian activity and explain them in plain words. I deliberately cannot move money, approve a payment or change your limit \u2014 those capabilities do not exist in my code, so no amount of asking will unlock them.`;

  if (has('what can you do', 'help me', 'how can you help', 'options'))
    return `Ask me things like: "why was my last payment flagged?", "how much has Guardian stopped?", "is 20000 to a new number safe?", "who are my riskiest recipients?", "what happens if I report fraud?", "how do I raise my limit?", or paste a suspicious message and I'll tell you what stands out.`;

  if (has('thank', 'thanks', 'thx'))
    return `Happy to help. If a payment ever feels rushed or unusual, stop and ask me before you send \u2014 that pause is the whole point of this app.`;

  // ---- Scam triage: paste the message, get an assessment.
  const scamWords = ['urgent', 'immediately', 'do not tell', "don't tell", 'otp', 'kyc', 'lottery',
    'prize', 'refund', 'blocked', 'verify your account', 'registration fee', 'lucky winner',
    'account will be', 'share the code', 'processing fee'];
  const hits = scamWords.filter((w) => m.includes(w));
  if (hits.length >= 2)
    return `That message carries several patterns I would not ignore: ${hits.slice(0, 4).join(', ')}. Time pressure, secrecy and any request for an OTP or an upfront fee are the three most reliable signs of a scam in India. Do not send anything. If they claim to be your bank, hang up and call the number printed on your card instead.`;

  // ---- Limit
  if (has('limit', 'ceiling', 'maximum', 'max i can'))
    return `Your limit is ${inr(limit)} per payment. You set it yourself under Profile \u2192 Payment limit; lowering it is instant, raising it asks for your PIN. Above your choice the server applies its own maximum of ${inr(HARD_LIMIT_INR)} on every request, so even a tampered payload cannot authorise more. I cannot change either number.`;

  if (has('raise', 'increase') && has('limit'))
    return `Profile \u2192 Payment limit, pick or type the amount, then confirm with your PIN. The PIN is asked only when you raise it \u2014 lowering it takes effect immediately, because making yourself safer should never be the harder action.`;

  // ---- Money protected
  if (has('protect', 'saved', 'stopped') && has('money', 'much', 'total', 'how')) {
    const items = txns.filter((t) => t.status === 'blocked');
    const total = items.reduce((a, t) => a + t.amount, 0);
    if (!items.length) return `Nothing has needed stopping yet. That is a good sign, not a quiet failure \u2014 every payment you made was scored before it went out.`;
    return `Guardian has stopped ${inr(total)} across ${items.length} payment${items.length > 1 ? 's' : ''} before they completed${items[0] ? `, the largest being ${inr(items[0].amount)} to ${items[0].recipientName}` : ''}. That counts only payments actually stopped, not every one that was flagged.`;
  }

  // ---- Refunds
  if (has('refund', 'money back', 'get it back', 'returned')) {
    const refunds = txns.filter((t) => t.status === 'refunded');
    if (refunds.length)
      return `Yes \u2014 ${inr(refunds.reduce((a, t) => a + t.amount, 0))} has come back to you. It shows in your history as a credit rather than by editing the original payment, so the record still says the money went out and later returned. Note this is a simulated dispute outcome: a settled UPI transfer is not reversible by the payer in real life.`;
    return `If a payment turns out to be fraud, open it in Activity and choose Report fraud. Answer four questions and TrustPay drafts a formal complaint to your bank. Money is returned automatically only when there is corroboration that does not come from you alone \u2014 the recipient blocked you, or others have reported them \u2014 within 24 hours, and no PIN or OTP was shared. Otherwise it goes to manual review, because an unconditional refund on request would let anyone buy something and keep both.`;
  }

  // ---- Riskiest recipients
  if (has('risky', 'riskiest', 'dangerous', 'avoid') || (has('who') && has('risk'))) {
    const risky = recipients.filter((r: any) => r.reportCount > 0 || r.trustScore < 40);
    if (!risky.length) return 'None of your recipients are currently carrying risk signals.';
    return `Watch these: ${risky.slice(0, 3).map((r: any) => `${r.name} \u2014 ${r.reportCount} report${r.reportCount === 1 ? '' : 's'}, trust ${r.trustScore}/100`).join('; ')}. Reputation figures are synthetic demo data.`;
  }

  // ---- Why flagged
  if (has('flag', 'why') && has('block', 'stop', 'flag', 'score', 'held')) {
    const t = txns.find((x) => x.risk && x.risk.level !== 'low');
    if (!t) return 'Nothing of yours has been flagged recently. Every payment you made scored in the low band.';
    const pos = (t.risk.factors ?? []).filter((f: any) => f.points > 0).slice(0, 3);
    return `${inr(t.amount)} to ${t.recipientName} scored ${t.risk.score}/100 (${t.risk.level}). What moved it: ${pos.map((f: any) => `${f.label.toLowerCase()} (+${f.points})`).join(', ')}. Trust history is subtracted too, which is why a large payment to someone you pay often can still score low.`;
  }

  // ---- Is X safe / should I pay
  if (has('safe', 'should i pay', 'should i send', 'is it ok', 'trust'))
    return `Enter the amount and recipient and Guardian will score it before anything leaves. I can explain the score, but I do not make the decision \u2014 the policy engine does, and it runs on the server where I cannot reach it. As a rule: a first payment to a new account, prompted by a message that creates urgency, is the shape almost every scam takes.`;

  // ---- Guardians and approvals
  if (has('guardian', 'approval', 'approve', 'dad', 'mom')) {
    const names = (s?.guardians ?? []).map((g: any) => `${g.name} (${g.relation})`).join(', ');
    return `Your Guardian Circle is ${names || 'empty'}. A payment goes to them when it scores medium or high, when it is above your approval amount, or when a new recipient appears while Travel Protection is on. They see the amount, the recipient and the exact reasons, then approve or reject. Approving does not send money by itself \u2014 the server issues a single-use token bound to that exact payment and amount, and the payment is re-checked before anything moves. I cannot approve on their behalf.`;
  }

  // ---- Travel
  if (has('travel', 'travelling', 'traveling', 'abroad', 'trip'))
    return `Travel Protection tightens every threshold while you are away and names one Guardian to watch. It can only make checks stricter, never looser. You can hand the phone to that Guardian from the banner on your home screen, and they can approve or pay on your behalf until you switch back.`;

  // ---- Credentials
  if (has('otp', 'pin', 'password', 'cvv'))
    return `Never share your UPI PIN, OTP, CVV or password \u2014 not with me, not with anyone who calls claiming to be support, and not with a "bank officer" who contacted you first. TrustPay will never ask for them. Anyone who does is running the scam.`;

  // ---- Bills
  if (has('bill', 'due', 'reminder', 'electricity', 'recharge'))
    return `Your upcoming bills are listed under "Coming up" on the home screen, soonest first, with the amount and how many days are left. Anything due within five days is highlighted.`;

  // ---- Status
  if (has('status', 'security', 'how safe am i', 'summary'))
    return `Protection is on. Limit ${inr(limit)} per payment, ${s?.guardians?.length ?? 0} people in your Guardian Circle, mode "${s?.mode ?? 'balanced'}", Travel Protection ${s?.travelMode ? 'on' : 'off'}. ${txns.filter((t: any) => t.status === 'blocked').length} payment(s) stopped so far.`;

  // ---- Recent payment
  if (has('latest', 'last', 'recent') || (has('payment') && has('my'))) {
    const t = txns[0];
    if (!t) return 'There are no payments in your activity yet.';
    return `Your most recent entry: ${inr(t.amount)} ${t.direction === 'credit' ? 'received from' : 'to'} ${t.recipientName}, status ${t.status}${t.risk ? `, risk ${t.risk.score}/100 (${t.risk.level})` : ''}.`;
  }

  // ---- What TrustBot cannot do
  if (has('send', 'pay', 'transfer') && has('you', 'for me', 'can you'))
    return `I cannot. TrustBot has no access to the payment engine at all \u2014 my code does not import it, so there is no path from anything I say to money moving. Use the Pay tab and Guardian will check it properly.`;

  return `I did not quite catch that, but I can help with: why a payment was flagged, how much Guardian has stopped, your limit and how to change it, what happens when you report fraud, which recipients look risky, how Guardian approvals work, or whether a message you were sent looks like a scam \u2014 paste it and I'll tell you what stands out.`;
}
