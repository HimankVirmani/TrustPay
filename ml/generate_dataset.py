"""
Synthetic transaction dataset generator for Guardian's fraud model.

IMPORTANT: every row here is fabricated. No real user, recipient, or payment
data is involved. The generator encodes plausible *structure* (fraud correlates
with new recipients, prior reports, amount deviation, urgency language) so the
model has something learnable, plus substantial noise and deliberate
counter-examples so the task is not trivially separable.
"""
import numpy as np
import pandas as pd

RNG = np.random.default_rng(20240517)
N = 1500
FRAUD_RATE = 0.17


def _clip(x, lo, hi):
    return float(np.clip(x, lo, hi))


def make_row(is_fraud: bool) -> dict:
    if is_fraud:
        new_recipient = int(RNG.random() < 0.82)
        recipient_age_days = int(RNG.gamma(1.6, 40)) if new_recipient else int(RNG.gamma(4, 90))
        recipient_txn_count = int(RNG.gamma(1.3, 6))
        recipient_report_count = int(RNG.poisson(1.9))
        historical_relationship = 0 if new_recipient else int(RNG.integers(0, 4))
        user_avg_payment = _clip(RNG.normal(2400, 900), 300, 9000)
        amount = _clip(RNG.lognormal(np.log(9000), 0.75), 100, 20000)
        urgency_score = _clip(RNG.beta(4.5, 2.0) * 100, 0, 100)
        secrecy_score = _clip(RNG.beta(3.2, 2.4) * 100, 0, 100)
        txn_velocity_1h = int(RNG.poisson(2.4))
        hour = int(RNG.choice(range(24), p=_night_weighted()))
    else:
        new_recipient = int(RNG.random() < 0.24)
        recipient_age_days = int(RNG.gamma(5, 110)) if not new_recipient else int(RNG.gamma(2.2, 55))
        recipient_txn_count = int(RNG.gamma(4.5, 14))
        recipient_report_count = int(RNG.poisson(0.09))
        historical_relationship = 0 if new_recipient else int(RNG.integers(1, 40))
        user_avg_payment = _clip(RNG.normal(2400, 900), 300, 9000)
        amount = _clip(RNG.lognormal(np.log(1500), 0.95), 20, 20000)
        urgency_score = _clip(RNG.beta(1.6, 6.0) * 100, 0, 100)
        secrecy_score = _clip(RNG.beta(1.2, 8.0) * 100, 0, 100)
        txn_velocity_1h = int(RNG.poisson(0.7))
        hour = int(RNG.choice(range(24), p=_day_weighted()))

    amount_deviation = amount / max(user_avg_payment, 1.0)
    row = {
        "amount": round(amount, 2),
        "hour": hour,
        "is_new_recipient": new_recipient,
        "recipient_age_days": recipient_age_days,
        "recipient_txn_count": recipient_txn_count,
        "recipient_report_count": recipient_report_count,
        "user_avg_payment": round(user_avg_payment, 2),
        "amount_deviation": round(amount_deviation, 3),
        "txn_velocity_1h": txn_velocity_1h,
        "urgency_score": round(urgency_score, 1),
        "secrecy_score": round(secrecy_score, 1),
        "historical_relationship": historical_relationship,
        "is_odd_hour": int(hour < 6 or hour >= 23),
        "is_fraud": int(is_fraud),
    }
    return row


def _night_weighted():
    w = np.array([3.0 if (h < 6 or h >= 22) else 1.0 for h in range(24)])
    return w / w.sum()


def _day_weighted():
    w = np.array([0.35 if (h < 6 or h >= 23) else 1.0 for h in range(24)])
    return w / w.sum()


def build() -> pd.DataFrame:
    labels = RNG.random(N) < FRAUD_RATE
    rows = [make_row(bool(f)) for f in labels]
    df = pd.DataFrame(rows)

    # Deliberate label noise so the problem is NOT linearly separable and the
    # reported metrics stay honest rather than a suspicious 1.00 across the board.
    flip = RNG.choice(df.index, size=int(0.045 * len(df)), replace=False)
    df.loc[flip, "is_fraud"] = 1 - df.loc[flip, "is_fraud"]

    # Hard negatives: large, high-deviation payments to long-trusted recipients
    # (rent, tuition, family). These are the false-positive traps the product
    # must survive -- Scenario 8 in the brief.
    idx = RNG.choice(df.index[df.is_fraud == 0], size=70, replace=False)
    df.loc[idx, "amount"] = np.round(RNG.uniform(12000, 20000, size=len(idx)), 2)
    df.loc[idx, "amount_deviation"] = np.round(
        df.loc[idx, "amount"] / df.loc[idx, "user_avg_payment"], 3)
    df.loc[idx, "is_new_recipient"] = 0
    df.loc[idx, "historical_relationship"] = RNG.integers(14, 60, size=len(idx))
    df.loc[idx, "recipient_report_count"] = 0

    # Hard positives: small, calm, "clean-looking" fraud to avoid the model
    # learning that fraud is simply "big and loud".
    idx2 = RNG.choice(df.index[df.is_fraud == 1], size=55, replace=False)
    df.loc[idx2, "amount"] = np.round(RNG.uniform(400, 2500, size=len(idx2)), 2)
    df.loc[idx2, "urgency_score"] = np.round(RNG.uniform(0, 22, size=len(idx2)), 1)
    df.loc[idx2, "secrecy_score"] = np.round(RNG.uniform(0, 15, size=len(idx2)), 1)
    df.loc[idx2, "amount_deviation"] = np.round(
        df.loc[idx2, "amount"] / df.loc[idx2, "user_avg_payment"], 3)

    return df


if __name__ == "__main__":
    d = build()
    d.to_csv("ml/dataset.csv", index=False)
    print(f"rows={len(d)} fraud={int(d.is_fraud.sum())} rate={d.is_fraud.mean():.3f}")
