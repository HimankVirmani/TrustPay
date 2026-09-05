# TrustPay

**A second pair of eyes before you pay.**

An Indian payment app with an intelligent safety layer. It does everything a UPI
app does — pay a contact, scan a QR, transfer to a bank account, recharge a
phone, pay bills — and adds one thing none of them do: it looks at a payment
before it leaves, tells you plainly what it noticed, and lets someone you trust
weigh in when it matters.

> Payments should be fast. Important payments should also be safe.

**This is a hackathon prototype. No real money moves, no real recipients exist,
and no payment credentials are stored.**

---

## The problem

India runs on UPI, and UPI is optimised for speed. A payment takes four seconds
and is effectively irreversible. That is excellent for splitting a lunch bill and
catastrophic when the person on the other end is running a scam — a fake refund
agent, a "KYC expired" message, a relative in trouble who is not actually your
relative.

The existing defence is a PIN, which only proves the phone's owner pressed the
buttons. It does not ask whether they should. Every part of the flow is designed
to remove friction, so the one moment where friction would help — an unusual
amount to an account you have never paid, prompted by an urgent message — passes
without comment.

## The solution

TrustPay keeps payments fast and adds a proportionate pause where it earns its
place:

- **Second Look** — a 0–100 risk score before authorisation, with a reason
  attached to every point that moved it.
- **Scam Shield** — checks the message attached to a payment for time pressure,
  secrecy, emotional pressure and credential requests.
- **Purpose as evidence** — the optional purpose field is not a receipt label.
  Advance-fee fraud in India arrives wearing a small set of cover stories, so
  selecting "Job registration", "KYC update", "Refund processing", "Prize claim"
  or "Investment opportunity" adds 22 points and shows why. A ₹15,999 payment to
  a new recipient scores 60; the same payment declared as a job registration fee
  scores 82 and crosses from medium into high risk.
- **Guardian Circle** — trusted people who can approve or reject a payment.
- **Travel Mode** — tighter thresholds while you are away.
- **Recovery** — a structured, transparent workflow when something goes wrong.
- **A payment limit you choose**, changeable only with your PIN, under a system
  maximum the server enforces independently.

### Fraud reporting that produces something usable

Reporting a payment asks four questions — what kind of fraud, how they first
reached you, what happened in your words, and whether the recipient blocked you
or you shared a credential — then drafts a formal complaint to your bank. The
letter identifies the transaction, sets out the sequence of events, makes four
numbered requests including a lien on the beneficiary account, cites the RBI
Customer Protection circular (DBR.No.Leg.BC.78/09.07.005/2017-18), points to
cybercrime.gov.in and 1930, and reserves the RBI Ombudsman route after 30 days.
Complaint status is tracked under Profile → Fraud complaints.

### What a Guardian sees

Guardian Mode is not the payer's screen with a different name on it. A Guardian
is on duty, not shopping, so their home screen drops the balance, the bill
reminders and the quick-pay grid, and leads with what is waiting on them. Their
navigation replaces Pay with Approvals and drops Profile entirely — those are the
payer's settings, and a Guardian has no business changing someone else's limit,
protection mode or Circle. While Travel Protection is on they can also send a
payment on the traveller's behalf.

Medium and high risk both route to a Guardian in Balanced and Maximum modes: the
approval threshold sits at 31, the top of the low band, so anything the engine
finds unusual gets a second person rather than a self-confirm prompt.

### Simulated recovery, with preconditions

If the recipient cuts off contact after taking the money, the case can resolve as
an instant return. **This is a simulation of a bank-side dispute outcome, not a
UPI feature** — a settled UPI transfer cannot be reversed by the payer, and in
reality the beneficiary bank must mark a lien with a human process over days.

The preconditions exist because "report fraud, get money back" with no conditions
is trivially abusable: anyone could pay for goods, report fraud and keep both.
Reversal therefore needs corroboration that does not come from the reporter alone:

| Case | Outcome |
|---|---|
| Blocked by recipient, within 24h, no credentials shared | Funds returned |
| 2+ independent reports against the recipient, within 24h | Funds returned |
| Blocked, but reported after 24h | Lien marked, manual review |
| Blocked, but a PIN or OTP was shared | Lien marked, manual review |
| No corroboration at all | Manual review only |
| Payment never completed | Nothing to reverse |

### Your own payment limit

Profile → Payment limit lets you set any per-payment ceiling you like, starting
at ₹20,000. Lowering it is instant. **Raising it requires your PIN**, because
that is the direction someone holding your unlocked phone would want to move it.

Behind your choice sits a system maximum of **₹1,00,000** that the server applies
with `Math.min` on every request. A tampered payload carrying
`userLimit: 99999999` still cannot authorise more than that, so the settings
screen can never unlock an unbounded transfer.

### The authorisation window

A payment must be authorised within 120 seconds of the risk verdict appearing.
A live countdown runs on the review and PIN screens, turning amber under 30
seconds. If it lapses the payment fails exactly as a gateway timeout does — no
money moved, balance unchanged, attempt recorded in history.

### Security on open

TrustPay locks itself every time it opens. The lock screen is a demo gate — any
four digits pass, nothing is stored, hashed or transmitted — because a real build
would defer to the device keystore or a biometric prompt, where the credential
never reaches app code at all.

### The key innovation

Not "detect fraud" — a fraud dashboard bolted onto a payment app. The innovation
is **a safety layer that a normal person actually keeps switched on**, which
means it must be *proportionate*. A system that questions every payment gets
ignored, and an ignored warning is worth nothing. So Guardian:

1. **Subtracts earned trust.** Paying your landlord ₹18,000 for the 24th time is
   7.5× your normal payment — and scores 8/100, because history is evidence.
   Credits are capped at 70% of the risk signal, so trust discounts risk without
   silently erasing it.
2. **Escalates instead of blocking.** Most interventions are a question, not a
   wall.
3. **Explains itself every time**, so the user learns what a scam looks like.

---

## User journeys

**Everyday payment.** Home → Pay anyone → number or UPI ID → recipient resolves →
amount → Second Look shows low risk → test PIN → done.

**Something is off.** Amount and message go in → Second Look scores 87 → Scam
Shield flags urgency and secrecy → user asks Dad → Dad sees the amount, recipient
and reasons on his own screen → Dad rejects → payment blocked, audit trail written.

**After the fact.** A completed payment turns out to be fraud → Report fraud →
investigation computes a confidence score from observable signals → recovery
eligibility is assessed against published criteria → simulated recovery runs →
recovered, or escalated for manual review with evidence preserved.

---

## Payment flow

Every rail runs the same sequence:

```
amount + purpose + funding source
        ↓
   Second Look      risk score, reasons, Scam Shield
        ↓
   authorisation    UPI PIN → "Verifying PIN…" → "PIN verified"
        ↓
   Safety check     recipient · pattern · risk signals · limit · Guardian policy
        ↓
   receipt          amount, payment ID, method, source, then the risk card
```

The Safety Check screen reports checks the server has already performed; it does
not decide anything. The pause is deliberate — it is the last moment a user can
recognise a mistake, and two seconds is still fast enough to feel instant.

Funding sources are real state: choosing HDFC •••• 4321 debits that account, the
composer refuses an amount the account cannot cover, and **Check balance** shows
all three with a reveal toggle.

## Risk engine

`src/lib/risk-engine.ts` — a multi-signal additive scorer, not a single rule.

| Group | Signals |
|---|---|
| Recipient | first-time payment, prior reports, trust score, account age, your payment history |
| Amount | deviation from your normal, proximity to the ceiling |
| Behaviour | unusual hour, payment velocity, repeated payments to a new recipient |
| Message | urgency, secrecy, emotional pressure, credential requests (via Scam Shield) |
| Context | Travel Mode sensitivity |

Bands: **0–30 low · 31–70 medium · 71–100 high.** Every factor carries a label,
a point value and a plain-language explanation, so the UI never shows a number
without a reason. Reported recipients and confirmed scam language have a score
floor that history cannot discount away.

## Policy engine

`src/lib/policy-engine.ts` is the only component that can authorise a payment.
It returns `allow`, `verify`, `guardian_required` or `block`. Protection
preference (Convenience / Balanced / Maximum) moves the thresholds; Travel Mode
only ever tightens them. **The ₹20,000 ceiling is checked before anything else
and is identical in every mode.**

## Security architecture

```
User → Validation → Risk engine → Policy engine → Guardian approval → Test adapter
```

Enforced at five independent layers: the UI disables the button, the risk API,
the payment API, the policy engine and the payment adapter each re-check the
ceiling. Client-supplied risk scores are ignored and recomputed server-side.

**Guardian approval cannot be forged.** Approving mints a single-use,
15-minute, server-held token bound to the transaction id *and* the amount. The
payment is then re-run through the entire pipeline presenting that token. Verified
behaviour:

| Attack | Result |
|---|---|
| No token on a payment needing approval | Rejected |
| Forged token | Rejected — not recognised |
| Token issued for a different payment | Rejected — different payment |
| Token for ₹12,000 replayed at ₹19,999 | Rejected — amount changed |
| Correct token reused | Rejected — already used |
| Guardian approving ₹25,000 | Rejected — above the ceiling |

**The LLM cannot move money.** `/api/chat` returns text only and imports no
financial module. The capability does not exist at that layer, so no prompt can
unlock it.

No PINs, OTPs, passwords or card details are stored or transmitted. The PIN
screen accepts any four digits and keeps them in component state.

---

## ML methodology

Run `python3 ml/train.py`. Everything on the insights and dashboard screens is
read from `public/ml/metrics.json`, which that script writes. **No metric in this
repository is hand-written.** If you retrain, the UI changes.

**Dataset** — `ml/generate_dataset.py` builds 1500
synthetic transactions at a 20% fraud rate. To keep
the task honest it includes 4.5% label noise, plus deliberate **hard negatives**
(large, high-deviation payments to long-trusted recipients — the false-positive
trap) and **hard positives** (small, calm, clean-looking fraud). Without these a
classifier learns "fraud is big and loud" and scores suspiciously well.

**Split** — 1200 train / 300 held
out, 80/20 stratified, random_state=42.

**Models compared** — measured on the held-out set:

| Model | Precision | Recall | F1 | ROC AUC |
|---|---|---|---|---|
| Logistic Regression | 0.830 | 0.733 | 0.779 | 0.830 |
| Random Forest | 0.936 | 0.733 | 0.822 | 0.863 |
| Gradient Boosting | 0.935 | 0.717 | 0.811 | 0.873 |

Selected: **Random Forest** (highest F1 on held-out test set).

Confusion matrix: **44** fraud caught, **16** missed,
**3** false alarms, **237** correctly cleared.
False positive rate 1.2%, false negative rate
26.7%.

### False-positive cost, and an honest finding

A false positive costs **₹150** — support handling plus friction from an interrupted legitimate payment. A blocked good payment is a real cost.
A false negative costs the actual rupee amount of the missed payment.

Minimising that cost function alone recommends a threshold of
**8**, where precision collapses to
**23%**. The maths is right and the product would
be unusable: a missed fraud costs thousands while an interruption costs ₹150, so
expected-value reasoning says *interrupt almost everything*.

TrustPay ships at a **constrained optimum instead — threshold
20**, the cheapest point satisfying
cheapest threshold with precision >= 0.50 and recall >= 0.50, giving precision 54% and
recall 77%. Both numbers are shown in the app, because
the trade-off is the interesting part.

### Live threshold simulator

`/insights` on mobile and `/dashboard` on desktop. Drag the threshold and
precision, recall, false positives, false negatives and estimated cost are read
from the pre-computed sweep over the **held-out test set** — a real
recomputation, not an animation.

---

## PWA

Installable and offline-capable: web app manifest, generated 192/512/maskable
icons, standalone display, theme colour, viewport-fit for notches, safe-area
padding, an app-shell service worker with an offline fallback page, an "Install
Guardian" prompt using `beforeinstallprompt` with iOS instructions as a fallback,
and home-screen shortcuts to Pay, Scan and Scam Shield.

**The service worker never caches `/api/*`** — a risk decision must always reach
the server. Offline, the app says so rather than pretending a payment succeeded.

---

## Running it

```bash
npm install
python3 ml/train.py     # generates the dataset, trains, writes metrics.json
npm run dev             # http://localhost:3000
```

`npm run build && npm start` for production. Deploy to Vercel as-is — no
environment variables are required.

### Environment variables

All optional; see `.env.example`. `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
switch the adapter to Razorpay **test mode** (keys not starting with `rzp_test_`
are refused). `ANTHROPIC_API_KEY` enables LLM-written chatbot replies; without it
a deterministic answerer reads the same data, so the demo never depends on a
network call.

### Demo credentials

None. The app opens as a seeded demo user, **Himank Sethi**. Guardian Mode
switches roles on the same device via Guardian → *View as Dad*.

Useful lookups on the Pay screen: `rahul@upi` (suspicious, 2 reports),
`refund.help@upi` (reported, 7 reports), `amitk@upi` (trusted, paid 26 times),
`venkatesan.rent@upi` (trusted landlord), `kiran.d@upi` (new account).

---

## Demo scenarios

One tap each, from **Profile → Demo scenarios**:

| # | Scenario | Expected |
|---|---|---|
| 1 | ₹500 to a frequent contact | Low risk, no friction |
| 2 | ₹8,000 to a new recipient | Medium risk, verification |
| 3 | ₹20,000 with an urgent, secretive message | Scam Shield fires, high risk, Guardian |
| 4 | Recipient with 7 reports | Score 100, blocked outright |
| 5 | ₹25,000 | Hard ceiling, blocked on client *and* server |
| 6 | Travel Mode + a risky payment | Thresholds tighten, Dad becomes Guardian |
| 7 | Report a completed payment | Investigation → recovery workflow |
| 8 | ₹18,000 rent to a 23-time recipient | **Scores 8/100** — proves it isn't just blocking everything |
| 9 | ₹15,999 to a new recipient, purpose "Job registration" | 60 → **82**, medium to high |
| 10 | **Blocked, then refunded** — they took ₹20,000 and cut contact | Report it, money returns as a visible credit |

Scenario 8 is the one worth watching. Same amount as scenario 3, opposite verdict.

### Suggested 4-minute run

Install the PWA → home → Pay ₹18,000 to `rahul@upi` with *"URGENT! Send
immediately. Don't tell anyone."* → Second Look → Scam Shield → ask Dad → switch
to Dad's view → reject → blocked → audit trail → pay ₹500 safely → try ₹25,000 →
ceiling → Travel Mode → report fraud → investigation → recovery → `/insights` →
drag the threshold slider → money protected and recovered.

---

## Graceful failure

Tick **"Simulate a gateway timeout"** on any amount screen. The payment fails and
the app states plainly that no money was charged and the balance is unchanged,
with Retry and View details. Recovery has its own failure path: automatic
recovery unavailable → escalated for manual review → evidence preserved. The
recovery workflow has explicit stopping rules (recovered, resolved, two attempts
reached, or withdrawn) so it cannot loop.

---

## Limitations

Stated plainly, because a prototype that oversells itself is the wrong kind of
fintech demo.

- **Recovery is simulated.** Settled UPI transfers are not generally reversible.
  Nothing here reverses a real payment; it models a PSP dispute workflow.
- **ML metrics describe synthetic data only.** Real fraud is adversarial, drifts,
  and has a far lower base rate. These numbers say the pipeline is sound, not
  that it would perform this way in production.
- **Recipient reputation is invented seed data**, not a bureau feed.
- **State is `localStorage` + an in-memory approval registry.** No database, no
  auth, single-instance only — approval tokens would not be shared across
  serverless instances.
- **Scam Shield is lexicon-based.** It catches common patterns in English and a
  little Hinglish, and will miss novel phrasing and other languages.
- **The app lock is not authentication.** It is a session gate for the demo, and
  balances are re-gated behind it on the Balance screen.
- **The auto-reversal is a simulation.** No real dispute is filed and no real
  money moves. Real recovery depends on the beneficiary bank acting while the
  funds are still present.
- **The drafted complaint is a starting point, not legal advice.** Check the
  details before sending it to a bank.
- **There is no high-risk override.** A user cannot push a payment past a block
  or past the ₹20,000 ceiling. That is the guarantee the rest of the design rests
  on, so no screen offers a way around it.
- **A low risk score is not a safety guarantee.** The UI never claims a payment
  is safe — only that these particular patterns were absent.

## Roadmap

Postgres for the approval registry and audit log; real UPI intent handoff via a
PSP; Guardian requests as push notifications to a Guardian's own device;
multilingual Scam Shield across major Indian languages; on-device model
inference; a shared reported-account signal across users with appropriate privacy
review; accessibility audit and screen-reader passes.

---

## Tech

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind · Recharts ·
scikit-learn · Razorpay test adapter · deployable to Vercel with zero config.

Built as a hackathon prototype under the Open Track.

---

## Brand

**TrustPay** is the product. **Guardian** is the safety layer inside it — the
risk engine, the Guardian Circle of trusted people, and Guardian AI. Keeping the
two words distinct means "Stopped by Guardian" and "Ask my Guardian" still read
correctly, rather than collapsing into the app's own name.

The mark is two overlapping shields: a second checker standing behind the first,
which is the product's whole argument in one shape. Paper shield in front with a
verification check, bronze shield behind, on the ink field used throughout the
app. Colour stays consistent with the in-app system, where saturated colour is
reserved for risk states.
