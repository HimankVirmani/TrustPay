# TrustPay — architecture

## Authorisation pipeline

Every payment on every rail (UPI, QR, bank transfer, recharge, bills) enters the
same server-side pipeline. There is no second path to the payment adapter.

```
                    ┌─────────────────────────┐
   User (PWA)  ───►  │  POST /api/payments/execute │
                    └───────────┬─────────────┘
                                │
                     1. VALIDATION
                        · amount is a positive number
                        · amount ≤ ₹20,000            ◄── hard ceiling, checked FIRST
                                │                         so no later signal can undo it
                     2. RISK ENGINE  (src/lib/risk-engine.ts)
                        · recipient, amount, behaviour, message signals
                        · returns 0–100 + a reason for every point
                                │
                     3. POLICY ENGINE  (src/lib/policy-engine.ts)
                        · allow | verify | guardian_required | block
                        · thresholds from protection mode; Travel Mode tightens
                                │
                     4. GUARDIAN CHECK  (src/lib/approval-registry.ts)
                        · a single-use server-issued token must be redeemed
                        · token is bound to txn id AND amount
                                │
                     5. PAYMENT ADAPTER  (src/lib/payment-adapter.ts)
                        · mock reference, or Razorpay TEST order
                        · re-checks the ₹20,000 ceiling (defence in depth)
                                │
                          AUDIT LOG (every step, timestamped)
```

The client's own risk score is never trusted. The server recomputes risk and
policy from the request on every call.

## Parallel systems

```
Transactions ──► ML risk model        (ml/train.py → public/ml/metrics.json)
Messages     ──► Scam Shield          (src/lib/scam-shield.ts)
Fraud reports ─► Investigation ──► Recovery workflow  (src/lib/recovery.ts)
Everything   ──► Audit log            (rendered per transaction + dashboard)
```

## Where the LLM sits

Guardian AI is deliberately outside the authorisation path.

```
User question ──► /api/chat ──► text reply
                     │
                     └── reads a read-only snapshot of the user's data
```

`src/app/api/chat/route.ts` does not import the payment adapter, the policy
engine or the approval registry. There is no code path from a model output to a
financial action, so the assistant cannot approve, send, cancel or raise a limit
even if a user talks it into agreeing to. Prompt wording is the second line of
defence, not the first.

## Trust boundaries

| Boundary | What is trusted | What is re-derived server-side |
|---|---|---|
| Client → API | The user's *intent* (amount, recipient, note) | Risk score, policy decision, approval validity |
| Guardian → API | That a decision was made | Whether approval was required, and the token binding |
| Adapter | Nothing | The hard limit, again |

## Known prototype limitations

- **State lives in `localStorage`** plus an in-memory approval registry. The
  registry is the first thing that would move to Postgres or Redis; on a
  multi-instance deploy, approval tokens would not be shared between instances.
- **No authentication.** There is one seeded demo user. Guardian Mode switches
  role on the same device so the approval loop can be demonstrated end to end.
- **Recipient reputation is synthetic.** It is generated seed data, not a
  bureau feed.
- **Recovery is simulated.** Settled UPI transfers are not generally reversible;
  this models the dispute workflow a PSP would run.
